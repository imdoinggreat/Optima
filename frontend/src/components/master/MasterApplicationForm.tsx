// frontend/src/components/master/MasterApplicationForm.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Building, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  DollarSign, 
  Target,
  Code,
  Users,
  Globe,
  BookOpen,
  Award,
  Brain,
  ChevronRight,
  Save,
  ArrowLeft
} from "lucide-react"
import { updateMasterProfile } from "@/lib/api"
import { SuccessModal } from "@/components/success-modal"

// 定义先修课选项（面向中国本科，覆盖文商科转技术常见先修）
const PREREQUISITE_COURSES = [
  // 数学统计
  { id: "calculus", label: "微积分", category: "数学统计" },
  { id: "linear_algebra", label: "线性代数", category: "数学统计" },
  { id: "probability", label: "概率论与数理统计", category: "数学统计" },
  { id: "statistics", label: "统计学", category: "数学统计" },
  { id: "discrete_math", label: "离散数学", category: "数学统计" },
  // 经济学
  { id: "microeconomics", label: "微观经济学", category: "经济学" },
  { id: "macroeconomics", label: "宏观经济学", category: "经济学" },
  { id: "econometrics", label: "计量经济学", category: "经济学" },
  { id: "economics_principles", label: "经济学原理", category: "经济学" },
  // 编程技术
  { id: "python", label: "Python 编程", category: "编程技术" },
  { id: "r_programming", label: "R 语言", category: "编程技术" },
  { id: "sql", label: "SQL / 数据库", category: "编程技术" },
  { id: "data_structures", label: "数据结构与算法", category: "编程技术" },
  { id: "computer_network", label: "计算机网络", category: "编程技术" },
  { id: "operating_system", label: "操作系统", category: "编程技术" },
  { id: "database_system", label: "数据库系统", category: "编程技术" },
  { id: "machine_learning", label: "机器学习基础", category: "编程技术" },
  { id: "deep_learning", label: "深度学习", category: "编程技术" },
  // 商科基础
  { id: "accounting", label: "会计学", category: "商科基础" },
  { id: "finance", label: "金融学", category: "商科基础" },
  { id: "marketing", label: "市场营销", category: "商科基础" },
  { id: "management", label: "管理学", category: "商科基础" },
  // 人文社科
  { id: "academic_writing", label: "学术写作", category: "人文社科" },
  { id: "research_methods", label: "研究方法", category: "人文社科" },
]

// 定义目标行业选项
const TARGET_INDUSTRIES = [
  "金融/投资银行", "咨询/战略", "科技/互联网", "市场营销/广告", 
  "数据分析/商业分析", "产品管理", "人力资源", "运营/供应链",
  "非营利/公益", "政府/公共政策", "教育/研究", "医疗健康",
  "房地产", "传媒/娱乐", "创业/自雇", "其他"
]

// 定义地理位置偏好
const LOCATION_PREFERENCES = [
  "美东（纽约/波士顿）", "美西（硅谷/西雅图）", "美国中部", "美国南部",
  "加拿大", "英国", "欧洲大陆", "新加坡", "香港", "澳大利亚",
  "回国（一线城市）", "回国（新一线城市）", "不限制"
]

export default function MasterApplicationForm() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [progress, setProgress] = useState(20)
  
  // 表单状态
  const [formData, setFormData] = useState({
    // 学术背景
    undergraduateMajor: "",
    undergraduateSchoolTier: "其他",
    gpa: "",
    gpaScale: "4.0" as "4.0" | "5.0" | "100",
    greVerbal: "",
    greQuant: "",
    greWriting: "",
    toefl: "",
    ielts: "",
    
    // 先修课
    selectedPrerequisites: [] as string[],
    otherPrerequisites: "",
    
    // 实习/工作、科研、课外/领导力（三模块）
    hasInternshipOrWork: false,
    workExperienceMonths: 0,
    internshipCount: 0,
    workDescription: "",
    researchExperience: "无",
    researchDescription: "",
    extracurricularDescription: "",
    leadershipDescription: "",
    
    // 职业规划
    targetIndustries: [] as string[],
    careerGoal: "未确定",
    requireSTEM: true,
    targetSalary: 80000,
    locationPreferences: [] as string[],
    
    // 项目偏好
    maxTuition: 80000,
    programDuration: 24,
    technicalIntensity: "适中",
    programPreferences: [] as string[],
    dreamSchools: "",
    targetSchools: "",
    safetySchools: ""
  })
  
  // 更新进度
  useEffect(() => {
    let newProgress = 20
    if (activeTab === "prerequisites") newProgress = 40
    if (activeTab === "experience") newProgress = 60
    if (activeTab === "career") newProgress = 80
    if (activeTab === "preferences") newProgress = 100
    setProgress(newProgress)
  }, [activeTab])

  const parseOptionalNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  }
  
  // 切换先修课
  const togglePrerequisite = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPrerequisites: prev.selectedPrerequisites.includes(courseId)
        ? prev.selectedPrerequisites.filter(id => id !== courseId)
        : [...prev.selectedPrerequisites, courseId]
    }))
  }
  
  // 切换目标行业
  const toggleIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      targetIndustries: prev.targetIndustries.includes(industry)
        ? prev.targetIndustries.filter(item => item !== industry)
        : [...prev.targetIndustries, industry]
    }))
  }
  
  // 切换地理位置
  const toggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      locationPreferences: prev.locationPreferences.includes(location)
        ? prev.locationPreferences.filter(item => item !== location)
        : [...prev.locationPreferences, location]
    }))
  }
  
  // 切换项目偏好
  const toggleProgramPreference = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      programPreferences: prev.programPreferences.includes(preference)
        ? prev.programPreferences.filter(item => item !== preference)
        : [...prev.programPreferences, preference]
    }))
  }
  
  // 保存草稿
  const saveDraft = async () => {
    try {
      setIsLoading(true)
      const draftData = { ...formData, application_status: "规划中" }
      await updateMasterProfile(draftData)
      // Silent save — no disruptive alert needed for draft
    } catch (error) {
      console.error("保存失败:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 提交表单
  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      
      // 构建提交数据（允许缺省 / 非4分制GPA / 只填部分考试）
      const gpaNumeric = parseOptionalNumber(formData.gpa)

      const testScores: Record<string, number | undefined> = {
        gre_verbal: parseOptionalNumber(formData.greVerbal),
        gre_quant: parseOptionalNumber(formData.greQuant),
        gre_writing: parseOptionalNumber(formData.greWriting),
        toefl: parseOptionalNumber(formData.toefl),
        ielts: parseOptionalNumber(formData.ielts),
      }

      // 过滤掉 undefined 的考试成绩
      const cleanedTestScores = Object.fromEntries(
        Object.entries(testScores).filter(([, v]) => v !== undefined),
      )

      // 先修课：预设 + 用户自填
      const extraCourses =
        formData.otherPrerequisites
          .split(/[，,]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0) || []

      const allCourses = [
        ...formData.selectedPrerequisites,
        ...extraCourses,
      ]

      const submitData = {
        undergraduate_major: formData.undergraduateMajor,
        undergraduate_school_tier: formData.undergraduateSchoolTier,
        gpa: gpaNumeric,
        gpa_scale: formData.gpaScale,
        test_scores: cleanedTestScores,
        prerequisite_completion: allCourses.map((course) => ({
          course,
          completed: true,
          grade: "A",
        })),
        work_experience_months: formData.workExperienceMonths,
        internship_count: formData.internshipCount,
        research_experience: formData.researchExperience,
        target_industries: formData.targetIndustries,
        career_goal: formData.careerGoal,
        require_stem: formData.requireSTEM,
        target_salary_usd: formData.targetSalary,
        location_preference: formData.locationPreferences,
        program_preference: {
          max_tuition: formData.maxTuition,
          min_duration: 12,
          max_duration: formData.programDuration,
          must_stem: formData.requireSTEM,
          technical_intensity: formData.technicalIntensity
        },
        application_status: "准备材料"
      }
      
      await updateMasterProfile(submitData)
      setSuccessModalOpen(true)

    } catch (error) {
      console.error("提交失败:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <>
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
        
        {/* 页面标题 */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            硕士申请档案
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-7 text-muted-foreground">
            填写详细信息，获得最适合您的硕士项目推荐
          </p>
        </div>
        
        {/* 进度条 */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>完成进度</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* 主表单区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              学术背景
            </TabsTrigger>
            <TabsTrigger value="prerequisites" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              先修课程
            </TabsTrigger>
            <TabsTrigger value="experience" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              实习科研
            </TabsTrigger>
            <TabsTrigger value="career" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              职业规划
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              项目偏好
            </TabsTrigger>
          </TabsList>
          
          {/* Tab 1: 学术背景 */}
          <TabsContent value="basic">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  基础档案信息
                </CardTitle>
                <CardDescription>
                  填写您的本科教育背景和标准化考试成绩
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10">
                <div className="space-y-6 rounded-xl border border-border/70 p-5">
                  <h3 className="text-xl font-semibold text-foreground">学术背景</h3>

                  <div className="space-y-2">
                    <Label htmlFor="undergraduateMajor">本科专业 *</Label>
                    <Input
                      id="undergraduateMajor"
                      value={formData.undergraduateMajor}
                      onChange={(e) => setFormData({...formData, undergraduateMajor: e.target.value})}
                      placeholder="例如：金融学、计算机科学、心理学"
                      className="w-full focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>本科院校梯队（影响录取竞争力评估）</Label>
                    <Select
                      value={formData.undergraduateSchoolTier}
                      onValueChange={(v) => setFormData({ ...formData, undergraduateSchoolTier: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择梯队" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="清北">清北（清华、北大）</SelectItem>
                        <SelectItem value="C9">C9 / 华五</SelectItem>
                        <SelectItem value="985">985</SelectItem>
                        <SelectItem value="211">211</SelectItem>
                        <SelectItem value="双一流">双一流</SelectItem>
                        <SelectItem value="其他">双非及其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA成绩 *</Label>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        id="gpa"
                        type="number"
                        step="0.01"
                        value={formData.gpa}
                        onChange={(e) =>
                          setFormData({ ...formData, gpa: e.target.value })
                        }
                        placeholder="3.8 或 88"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                      <Select
                        value={formData.gpaScale}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            gpaScale: value as "4.0" | "5.0" | "100",
                          })
                        }
                      >
                        <SelectTrigger className="w-full sm:w-36">
                          <SelectValue placeholder="制式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.0">4 分制</SelectItem>
                          <SelectItem value="5.0">5 分制</SelectItem>
                          <SelectItem value="100">百分制</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="space-y-6 rounded-xl border border-border/70 p-5">
                  <h3 className="text-xl font-semibold text-foreground">标准化考试成绩</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="greVerbal">GRE Verbal</Label>
                      <Input
                        id="greVerbal"
                        type="number"
                        min="130"
                        max="170"
                        value={formData.greVerbal}
                        onChange={(e) =>
                          setFormData({ ...formData, greVerbal: e.target.value })
                        }
                        placeholder="155"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground block">免 GRE 可留空</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="greQuant">GRE Quant</Label>
                      <Input
                        id="greQuant"
                        type="number"
                        min="130"
                        max="170"
                        value={formData.greQuant}
                        onChange={(e) =>
                          setFormData({ ...formData, greQuant: e.target.value })
                        }
                        placeholder="168"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="greWriting">GRE Writing</Label>
                      <Input
                        id="greWriting"
                        type="number"
                        step="0.5"
                        min="0"
                        max="6.0"
                        value={formData.greWriting}
                        onChange={(e) =>
                          setFormData({ ...formData, greWriting: e.target.value })
                        }
                        placeholder="4.0"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="toefl">TOEFL 总分</Label>
                      <Input
                        id="toefl"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.toefl}
                        onChange={(e) =>
                          setFormData({ ...formData, toefl: e.target.value })
                        }
                        placeholder="105"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ielts">IELTS 总分</Label>
                      <Input
                        id="ielts"
                        type="number"
                        step="0.5"
                        min="0"
                        max="9.0"
                        value={formData.ielts}
                        onChange={(e) =>
                          setFormData({ ...formData, ielts: e.target.value })
                        }
                        placeholder="7.5"
                        className="w-full sm:w-52 focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  保存草稿
                </Button>
                <Button onClick={() => setActiveTab("prerequisites")}>
                  下一步：先修课程
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Tab 2: 先修课程 */}
          <TabsContent value="prerequisites">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  先修课程完成情况
                </CardTitle>
                <CardDescription>
                  请选择您已完成的相关课程（重要！直接影响项目匹配）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <p className="text-sm text-muted-foreground">
                  硕士项目通常有先修课要求，您的完成情况将影响项目匹配度和录取概率
                </p>
                {/* 按类别分组显示先修课 */}
                {["数学统计", "经济学", "编程技术", "商科基础", "人文社科"].map(category => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-base font-semibold text-foreground">{category}</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {PREREQUISITE_COURSES
                          .filter(course => course.category === category)
                          .map(course => (
                            <div
                              key={course.id}
                              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                                formData.selectedPrerequisites.includes(course.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-muted-foreground/40"
                              }`}
                              onClick={() => togglePrerequisite(course.id)}
                            >
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={formData.selectedPrerequisites.includes(course.id)}
                                  onCheckedChange={() => togglePrerequisite(course.id)}
                                />
                                <Label className="cursor-pointer">{course.label}</Label>
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                ))}

                <div className="bg-primary/8 border border-primary/20 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-2">📊 先修课匹配分析</h4>
                  <p className="text-sm text-muted-foreground">
                    已选 {formData.selectedPrerequisites.length} 门课程。文商科转技术方向的项目通常需要 4-6 门核心先修课。
                    {formData.selectedPrerequisites.length < 4 && " 您可能需要补充相关课程。"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>其他相关课程（自填，逗号分隔）</Label>
                  <Textarea
                    value={formData.otherPrerequisites}
                    onChange={(e) =>
                      setFormData({ ...formData, otherPrerequisites: e.target.value })
                    }
                    placeholder="例如：高等代数, 机器学习导论..."
                    className="min-h-[96px] w-full focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    补充预设列表之外的课程，会纳入先修课匹配计算。
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("basic")}
                >
                  上一步
                </Button>
                <Button onClick={() => setActiveTab("experience")}>
                  下一步：实习科研
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Tab 3: 经历（实习/工作 → 科研 → 课外/领导力） */}
          <TabsContent value="experience">
            <div className="w-full space-y-6">

              {/* ① 实习/工作经历 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">实习 / 工作经历</CardTitle>
                      <CardDescription className="mt-0.5 text-sm">
                        填写段数和总时长，对量化背景竞争力影响较大
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                  <div className="flex items-center gap-6">
                    <Label className="shrink-0 text-sm font-semibold">是否有实习 / 工作</Label>
                    <div className="flex gap-5">
                      {[
                        { label: "是", value: true },
                        { label: "否", value: false },
                      ].map(({ label, value }) => (
                        <label key={label} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="hasInternship"
                            checked={formData.hasInternshipOrWork === value}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                hasInternshipOrWork: value,
                                ...(value === false
                                  ? { internshipCount: 0, workExperienceMonths: 0 }
                                  : {}),
                              })
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.hasInternshipOrWork && (
                    <>
                      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">实习段数</Label>
                          <div className="flex w-fit items-center gap-1 rounded-xl border border-input bg-background px-2 py-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-base"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  internshipCount: Math.max(0, formData.internshipCount - 1),
                                })
                              }
                            >
                              −
                            </Button>
                            <span className="min-w-[3rem] text-center text-base font-semibold tabular-nums">
                              {formData.internshipCount}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-base"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  internshipCount: formData.internshipCount + 1,
                                })
                              }
                            >
                              +
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">段正式实习</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">总时长（月）</Label>
                          <div className="flex w-fit items-center gap-1 rounded-xl border border-input bg-background px-2 py-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-base"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  workExperienceMonths: Math.max(
                                    0,
                                    formData.workExperienceMonths - 1,
                                  ),
                                })
                              }
                            >
                              −
                            </Button>
                            <span className="min-w-[3rem] text-center text-base font-semibold tabular-nums">
                              {formData.workExperienceMonths}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-base"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  workExperienceMonths: formData.workExperienceMonths + 1,
                                })
                              }
                            >
                              +
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">累计月数</p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-sm font-semibold">经历描述（可选）</Label>
                        <p className="text-xs text-muted-foreground">
                          简要说明实习内容、所在公司类型、核心职责或收获
                        </p>
                        <Textarea
                          value={formData.workDescription}
                          onChange={(e) =>
                            setFormData({ ...formData, workDescription: e.target.value })
                          }
                          placeholder="例：在某头部投行债券部实习 3 个月，负责行业研究和 Excel 建模..."
                          className="min-h-[100px] w-full"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ② 科研经历 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">科研经历</CardTitle>
                      <CardDescription className="mt-0.5 text-sm">
                        等级直接用于竞争力评估和项目匹配；学术导向项目对此权重更高
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">科研经历等级</Label>
                    <Select
                      value={formData.researchExperience}
                      onValueChange={(v) => setFormData({ ...formData, researchExperience: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="无">无</SelectItem>
                        <SelectItem value="课程项目">课程项目（无正式学术支持）</SelectItem>
                        <SelectItem value="实验室助理">实验室助理（有导师指导）</SelectItem>
                        <SelectItem value="独立研究">独立研究（有论文或报告成果）</SelectItem>
                        <SelectItem value="发表论文">发表论文（期刊/会议）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">科研描述（可选）</Label>
                    <p className="text-xs text-muted-foreground">
                      研究方向、导师背景、成果或发表情况等
                    </p>
                    <Textarea
                      value={formData.researchDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, researchDescription: e.target.value })
                      }
                      placeholder="例：参与某经济学院劳动力市场方向项目，协助数据清洗与回归分析，已提交 working paper..."
                      className="min-h-[100px] w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ③ 课外活动 / 领导力 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">课外活动 / 领导力</CardTitle>
                      <CardDescription className="mt-0.5 text-sm">
                        对协作导向、非营利、公共管理类项目影响显著
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">课外活动（可选）</Label>
                    <Textarea
                      value={formData.extracurricularDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, extracurricularDescription: e.target.value })
                      }
                      placeholder="例：校学生会副主席（2年），统筹学校职业发展节，对接 20+ 家企业..."
                      className="min-h-[100px] w-full"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">领导力经历（可选）</Label>
                    <Textarea
                      value={formData.leadershipDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, leadershipDescription: e.target.value })
                      }
                      placeholder="例：主导某商赛团队获华东赛区二等奖，负责整体策略和 PPT 呈现..."
                      className="min-h-[100px] w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 flex w-full justify-between">
              <Button variant="outline" onClick={() => setActiveTab("prerequisites")}>
                上一步
              </Button>
              <Button onClick={() => setActiveTab("career")}>
                下一步：职业规划
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          {/* Tab 4: 职业规划 */}
          <TabsContent value="career">
            <Card className="w-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">职业规划与目标</CardTitle>
                    <CardDescription className="mt-0.5 text-sm">
                      明确的就业方向是项目匹配的核心权重来源
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-10 pt-6">

                {/* 目标就业行业 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      目标就业行业 <span className="text-primary">*</span>
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">可多选</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_INDUSTRIES.map((industry) => (
                      <Badge
                        key={industry}
                        variant={
                          formData.targetIndustries.includes(industry) ? "default" : "outline"
                        }
                        className="cursor-pointer px-3 py-1.5 text-sm"
                        onClick={() => toggleIndustry(industry)}
                      >
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 毕业后规划 */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold">
                    毕业后规划 <span className="text-primary">*</span>
                  </Label>
                  <Select
                    value={formData.careerGoal}
                    onValueChange={(value) => setFormData({ ...formData, careerGoal: value })}
                  >
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder="请选择职业规划" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="留美就业">留美就业</SelectItem>
                      <SelectItem value="回国就业">回国就业</SelectItem>
                      <SelectItem value="继续深造">继续深造（博士/二硕）</SelectItem>
                      <SelectItem value="创业">创业</SelectItem>
                      <SelectItem value="未确定">未确定</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 目标起薪 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">目标起薪（美元 / 年）</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">$50K</span>
                      <span className="rounded-md bg-muted px-2.5 py-0.5 font-semibold tabular-nums text-foreground">
                        ${formData.targetSalary.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">$200K</span>
                    </div>
                    <Slider
                      value={[formData.targetSalary]}
                      onValueChange={([value]) =>
                        setFormData({ ...formData, targetSalary: value })
                      }
                      min={50000}
                      max={200000}
                      step={5000}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* STEM */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
                    <Checkbox
                      id="requireSTEM"
                      checked={formData.requireSTEM}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requireSTEM: checked as boolean })
                      }
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="requireSTEM" className="cursor-pointer text-sm font-semibold leading-5">
                        必须是 STEM 认证项目
                      </Label>
                      <p className="text-sm leading-6 text-muted-foreground">
                        STEM 认证项目毕业生可申请 3 年 OPT；非 STEM 项目仅 1 年。
                        若留美就业为核心诉求，强烈建议勾选。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 地理位置偏好 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      地理位置偏好
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">可多选</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      影响就业网络、生活成本和行业集群
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_PREFERENCES.map((location) => (
                      <Badge
                        key={location}
                        variant={
                          formData.locationPreferences.includes(location) ? "default" : "outline"
                        }
                        className="cursor-pointer px-3 py-1.5 text-sm"
                        onClick={() => toggleLocation(location)}
                      >
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setActiveTab("experience")}>
                  上一步
                </Button>
                <Button onClick={() => setActiveTab("preferences")}>
                  下一步：项目偏好
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Tab 5: 项目偏好 */}
          <TabsContent value="preferences">
            <Card className="w-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">项目偏好设置</CardTitle>
                    <CardDescription className="mt-0.5 text-sm">
                      预算与课程偏好将用于筛选候选项目清单
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-10 pt-6">

                {/* 预算与时长 */}
                <div className="space-y-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    预算与项目时长
                  </p>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">最高可接受学费（美元，总计）</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">$20K</span>
                        <span className="rounded-md bg-muted px-2.5 py-0.5 font-semibold tabular-nums text-foreground">
                          ${formData.maxTuition.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">$150K</span>
                      </div>
                      <Slider
                        value={[formData.maxTuition]}
                        onValueChange={([value]) =>
                          setFormData({ ...formData, maxTuition: value })
                        }
                        min={20000}
                        max={150000}
                        step={5000}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">项目时长偏好</Label>
                    <div className="flex flex-wrap gap-2">
                      {[12, 18, 24, 36].map((months) => (
                        <Button
                          key={months}
                          type="button"
                          variant={formData.programDuration === months ? "default" : "outline"}
                          className="min-w-[5rem]"
                          onClick={() => setFormData({ ...formData, programDuration: months })}
                        >
                          {months} 个月
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 课程偏好 */}
                <div className="space-y-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    课程偏好
                  </p>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">技术课程强度</Label>
                    <div className="flex flex-wrap gap-2">
                      {["轻松", "适中", "硬核"].map((intensity) => (
                        <Button
                          key={intensity}
                          type="button"
                          variant={
                            formData.technicalIntensity === intensity ? "default" : "outline"
                          }
                          className="min-w-[5rem]"
                          onClick={() =>
                            setFormData({ ...formData, technicalIntensity: intensity })
                          }
                        >
                          {intensity}
                        </Button>
                      ))}
                    </div>
                    {formData.technicalIntensity && (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {formData.technicalIntensity === "轻松" &&
                          "适合文商科背景，希望在主修商业课程的同时补充基础技术工具"}
                        {formData.technicalIntensity === "适中" &&
                          "适合有技术基础，希望在技术与商业管理之间取得均衡发展"}
                        {formData.technicalIntensity === "硬核" &&
                          "适合理工科背景，希望进入深度技术方向（数据工程、量化等）"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      其他偏好
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">可多选</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        "有Capstone项目",
                        "提供实习机会",
                        "可跨学院选课",
                        "小班教学",
                        "有双学位机会",
                        "滚动录取",
                        "免GRE",
                        "高奖学金比例",
                      ].map((preference) => (
                        <div key={preference} className="flex items-center gap-2.5">
                          <Checkbox
                            id={preference}
                            checked={formData.programPreferences.includes(preference)}
                            onCheckedChange={() => toggleProgramPreference(preference)}
                          />
                          <Label
                            htmlFor={preference}
                            className="cursor-pointer text-sm leading-5 text-foreground"
                          >
                            {preference}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 选校策略 */}
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      初步选校策略（可选）
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      填写已有想法的院校；系统将根据你的档案在此基础上补充推荐
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                      {
                        key: "dreamSchools" as const,
                        label: "冲刺（2–3 所）",
                        placeholder: "录取难度高、但非常想去的项目...",
                      },
                      {
                        key: "targetSchools" as const,
                        label: "目标（4–6 所）",
                        placeholder: "与你背景匹配的主要申请项目...",
                      },
                      {
                        key: "safetySchools" as const,
                        label: "保底（2–3 所）",
                        placeholder: "较为稳妥、确保录取的选择...",
                      },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-sm font-semibold">{label}</Label>
                        <Textarea
                          value={formData[key]}
                          onChange={(e) =>
                            setFormData({ ...formData, [key]: e.target.value })
                          }
                          placeholder={placeholder}
                          className="min-h-[96px] text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setActiveTab("career")}>
                  上一步
                </Button>
                <Button
                  size="lg"
                  className="px-8"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "提交中…" : "完成档案，开始匹配"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 信息汇总卡片 */}
        <Card className="mt-10">
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              申请档案概览
            </p>
            <CardTitle className="text-xl">当前填写进度</CardTitle>
            <CardDescription className="text-sm leading-6">
              完成全部模块后，系统将为你生成精准匹配的项目清单
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "先修课完成", value: `${formData.selectedPrerequisites.length} 门` },
                { label: "目标行业", value: `${formData.targetIndustries.length} 个` },
                { label: "实习时长", value: `${formData.workExperienceMonths} 个月` },
                { label: "STEM 要求", value: formData.requireSTEM ? "是" : "否" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-4 py-5 text-center"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <SuccessModal
      open={successModalOpen}
      onClose={() => {
        setSuccessModalOpen(false)
        router.push("/dashboard")
      }}
      primaryHref="/dashboard"
      title="测评数据上传完成 ✦"
      subtitle="你的专属选校报告正在生成，即将为你跳转结果页"
      primaryLabel="立即查看选校报告"
      secondaryLabel="稍后查看"
    />
    </>
  )
}