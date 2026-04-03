from __future__ import annotations

import argparse
import json
import math
import os
import re
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # 384-dim


def _clean_text(s: object) -> str:
    if s is None:
        return ""
    text = str(s)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _slice_around_keywords(text: str, keywords: Sequence[str], max_chars: int = 2500) -> str:
    """
    Best-effort: find the first occurrence of any keyword and take a window around it.
    Falls back to leading chunk.
    """
    if not text:
        return ""
    lower = text.lower()
    hits = [lower.find(k.lower()) for k in keywords]
    hits = [h for h in hits if h != -1]
    if not hits:
        return text[:max_chars]
    pos = min(hits)
    start = max(0, pos - max_chars // 3)
    end = min(len(text), start + max_chars)
    return text[start:end]


def extract_objectives_text(raw_text: str) -> str:
    # “program objectives / learning outcomes / mission / goals” 相关段落
    return _slice_around_keywords(
        raw_text,
        keywords=[
            "learning outcomes",
            "program outcomes",
            "program objectives",
            "objectives",
            "goals",
            "mission",
            "what you will learn",
            "students will",
        ],
        max_chars=2500,
    )


def extract_curriculum_text(raw_text: str) -> str:
    # “curriculum / courses / degree requirements” 相关段落
    return _slice_around_keywords(
        raw_text,
        keywords=[
            "curriculum",
            "course",
            "courses",
            "degree requirements",
            "required courses",
            "core courses",
            "electives",
            "credits",
            "capstone",
            "concentration",
        ],
        max_chars=3500,
    )


def _l2_normalize(x: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(x, axis=1, keepdims=True)
    norm = np.where(norm == 0, 1.0, norm)
    return x / norm


def _cosine_sim_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    # rows in a vs rows in b
    a_n = _l2_normalize(a)
    b_n = _l2_normalize(b)
    return a_n @ b_n.T


def load_skill_labels(skills_csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(skills_csv_path, dtype=str)
    if "label" not in df.columns:
        raise RuntimeError(f"skills file must include 'label' column: {skills_csv_path}")
    df["label"] = df["label"].map(_clean_text)
    df = df[df["label"] != ""].reset_index(drop=True)
    if len(df) != 30:
        raise RuntimeError(
            f"Expected 30 skill labels, got {len(df)} from {skills_csv_path}. "
            "Please edit backend/features/skills_30.csv to match your O*NET 30-dim taxonomy."
        )
    return df


def icc2_1(values: np.ndarray) -> np.ndarray:
    """
    ICC(2,1) per-dimension for (n_targets, n_raters, n_dims).

    values: shape (n_targets, n_raters, n_dims)
    returns: shape (n_dims,)
    """
    if values.ndim != 3:
        raise ValueError("values must be 3D: (n_targets, n_raters, n_dims)")
    n, k, d = values.shape
    if k < 2 or n < 2:
        return np.full((d,), np.nan, dtype=float)

    # Means
    mean_per_target = values.mean(axis=1, keepdims=True)  # (n,1,d)
    mean_per_rater = values.mean(axis=0, keepdims=True)  # (1,k,d)
    grand_mean = values.mean(axis=(0, 1), keepdims=True)  # (1,1,d)

    # Sum squares
    ss_target = k * ((mean_per_target - grand_mean) ** 2).sum(axis=0).reshape(d)
    ss_rater = n * ((mean_per_rater - grand_mean) ** 2).sum(axis=1).reshape(d)
    ss_error = ((values - mean_per_target - mean_per_rater + grand_mean) ** 2).sum(axis=(0, 1)).reshape(d)

    ms_target = ss_target / (n - 1)
    ms_rater = ss_rater / (k - 1)
    ms_error = ss_error / ((n - 1) * (k - 1))

    denom = ms_target + (k - 1) * ms_error + (k * (ms_rater - ms_error) / n)
    denom = np.where(denom == 0, np.nan, denom)
    return (ms_target - ms_error) / denom


@dataclass(frozen=True)
class BuildConfig:
    model_name: str
    input_csv: str
    output_csv: str
    skills_csv: str
    icc_threshold: float


def build_vectors(cfg: BuildConfig) -> pd.DataFrame:
    df = pd.read_csv(cfg.input_csv, dtype=str)
    required = ["university", "program", "degree", "school", "official_url", "field", "raw_text"]
    for c in required:
        if c not in df.columns:
            raise RuntimeError(f"Missing required column '{c}' in {cfg.input_csv}")

    df["raw_text"] = df["raw_text"].map(_clean_text)
    df["objectives_text"] = df["raw_text"].map(extract_objectives_text)
    df["curriculum_text"] = df["raw_text"].map(extract_curriculum_text)

    model = SentenceTransformer(cfg.model_name)

    # 384-dim semantic vector from objectives-like text
    sem_emb = model.encode(
        df["objectives_text"].tolist(),
        batch_size=16,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    sem_emb = np.asarray(sem_emb, dtype=np.float32)

    # 30-dim ability match vector: cosine(project_curriculum_embedding, each_skill_label_embedding)
    skills_df = load_skill_labels(cfg.skills_csv)
    skill_labels = skills_df["label"].tolist()
    skill_emb = model.encode(
        skill_labels,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    skill_emb = np.asarray(skill_emb, dtype=np.float32)

    proj_emb = model.encode(
        df["curriculum_text"].tolist(),
        batch_size=16,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    proj_emb = np.asarray(proj_emb, dtype=np.float32)

    sims = _cosine_sim_matrix(proj_emb, skill_emb)  # (n,30)
    sims = sims.astype(np.float32)

    # ICC reliability filter (only if multi-source curriculum text exists)
    # If you later add columns like curriculum_text_catalog/curriculum_text_handbook, they will be included as raters.
    rater_cols = [c for c in df.columns if c.startswith("curriculum_text_")]
    keep_mask = np.ones((sims.shape[1],), dtype=bool)
    icc_vals: Optional[np.ndarray] = None
    if len(rater_cols) >= 2:
        # recompute per-rater sims
        raters = []
        for c in rater_cols:
            emb = model.encode(df[c].map(_clean_text).tolist(), batch_size=16, show_progress_bar=True, normalize_embeddings=True)
            emb = np.asarray(emb, dtype=np.float32)
            raters.append(_cosine_sim_matrix(emb, skill_emb).astype(np.float32))
        vals = np.stack(raters, axis=1)  # (n,k,30)
        icc_vals = icc2_1(vals)  # (30,)
        keep_mask = np.isfinite(icc_vals) & (icc_vals >= cfg.icc_threshold)

        # apply filter
        sims = sims[:, keep_mask]
        skills_df = skills_df.loc[keep_mask].reset_index(drop=True)

    # Assemble output
    out = df[["university", "program", "degree", "school", "official_url", "field"]].copy()
    out["ability_dim"] = int(sims.shape[1])
    out["semantic_dim"] = int(sem_emb.shape[1])
    out["ability_labels"] = [json.dumps(skills_df["label"].tolist(), ensure_ascii=False)] * len(out)

    if icc_vals is None:
        out["icc_threshold"] = cfg.icc_threshold
        out["icc_kept_dims"] = sims.shape[1]
        out["icc_values"] = ["" for _ in range(len(out))]
    else:
        out["icc_threshold"] = cfg.icc_threshold
        out["icc_kept_dims"] = int(keep_mask.sum())
        out["icc_values"] = [json.dumps(icc_vals.tolist(), ensure_ascii=False)] * len(out)

    # vectors: store as JSON arrays for portability
    out["ability_vector"] = [json.dumps(row.tolist(), ensure_ascii=False) for row in sims]
    out["semantic_vector"] = [json.dumps(row.tolist(), ensure_ascii=False) for row in sem_emb]
    out["project_vector_P"] = [
        json.dumps(np.concatenate([sims[i], sem_emb[i]]).tolist(), ensure_ascii=False) for i in range(len(out))
    ]
    out["project_vector_dim"] = out["ability_dim"] + out["semantic_dim"]

    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default=os.path.join("crawler", "data", "03_program_details.csv"),
        help="Input CSV (crawler output with raw_text)",
    )
    parser.add_argument(
        "--output",
        default=os.path.join("crawler", "data", "04_program_vectors.csv"),
        help="Output CSV (vectors as JSON arrays)",
    )
    parser.add_argument(
        "--skills",
        default=os.path.join("features", "skills_30.csv"),
        help="Skill labels CSV (exactly 30 rows with 'label' column)",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL, help="SentenceTransformer model name")
    parser.add_argument("--icc-threshold", type=float, default=0.6, help="ICC(2,1) threshold to keep dims")
    args = parser.parse_args()

    cfg = BuildConfig(
        model_name=args.model,
        input_csv=args.input,
        output_csv=args.output,
        skills_csv=args.skills,
        icc_threshold=float(args.icc_threshold),
    )

    out = build_vectors(cfg)
    os.makedirs(os.path.dirname(cfg.output_csv), exist_ok=True)
    out.to_csv(cfg.output_csv, index=False, encoding="utf-8")
    print(f"✅ vectors written: {cfg.output_csv} rows={len(out)} dims(P)={int(out['project_vector_dim'].iloc[0]) if len(out) else 0}")


if __name__ == "__main__":
    main()

