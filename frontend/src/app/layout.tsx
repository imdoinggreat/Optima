import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Orbitron,
  Share_Tech_Mono,
  JetBrains_Mono,
  Calistoga,
  Caveat,
  DM_Serif_Display,
  DM_Sans,
  Noto_Sans_SC,
  Noto_Serif_SC,
  LXGW_WenKai_TC,
} from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { ThemeSwitcher } from "@/components/theme-switcher"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
})
const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech",
  subsets: ["latin"],
  weight: "400",
})
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "700"],
})
const calistoga = Calistoga({
  variable: "--font-calistoga",
  subsets: ["latin"],
  weight: "400",
})
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})
const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
})
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
})
const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
})
const lxgwWenKai = LXGW_WenKai_TC({
  variable: "--font-lxgw",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
})

export const metadata: Metadata = {
  title: "Optima — 全球留学智能选校平台",
  description: "基于多信号推断的AI选校决策系统，覆盖全学科593个项目，13个国家",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          orbitron.variable,
          shareTechMono.variable,
          jetbrainsMono.variable,
          calistoga.variable,
          caveat.variable,
          dmSerifDisplay.variable,
          dmSans.variable,
          notoSansSC.variable,
          notoSerifSC.variable,
          lxgwWenKai.variable,
          "antialiased",
        ].join(" ")}
      >
        <Providers>
          {children}
          <ThemeSwitcher />
        </Providers>
      </body>
    </html>
  )
}
