import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'

const ABOUT_CONTENT = [
  {
    title: '编写',
    icon: 'edit',
    paragraphs: [
      '四种记录方式，适配不同的书写场景。随笔如便签纸，快速捕捉转瞬即逝的灵感；日记配备完整富文本编辑器，支持标题、列表、图片、手绘板，适合长篇书写；心情以 8 种情绪 × 5 级强度精确记录当下的感受；备忘以清单形式管理待办事项，勾选完成一目了然。',
      '编辑器内置语音转文字、手绘画板（铅笔、钢笔、毛笔、水彩、蜡笔、喷漆、油漆桶等 7 种笔刷）、标签分类、天气与地点标记，所有内容自动保存。工具栏按钮支持自定义搭配，按你的使用习惯自由调整。',
    ],
  },
  {
    title: '回忆',
    icon: 'clock',
    paragraphs: [
      '时间线按天分组展示所有记录，支持按类型、标签、情绪、时间范围多维度筛选和搜索，关键词高亮显示。',
      '往年今日自动浮现在首页，帮你找回去年今天写下的文字。时光信是写给未来自己的信，到期后你会收到一封来自过去的问候。',
      '分享功能可将单条记录或每日合集生成精美卡片图片，自定义显示日期、分类、标语、水印等元素，一键保存分享。',
    ],
  },
  {
    title: '日历',
    icon: 'calendar',
    paragraphs: [
      '情绪日历以不同颜色点亮日历上的每一天，每种颜色代表当日的主导情绪，一眼看见整月的心情变化。点击任意日期可查看当天的全部记录，也支持跳转到过去的日子修改或补充内容。',
      '日历底部显示本月记录天数、总记录数和本月主情绪统计，帮你快速了解近期的记录状态。',
    ],
  },
  {
    title: '统计',
    icon: 'chart',
    paragraphs: [
      '数据概览展示你的记录全貌：总记录数量、记录天数、连续记录天数（Streak）、累计总字数。',
      '情绪趋势折线图展示近期变化，分布饼图呈现各情绪占比，年度像素图用 365 个色块铺满全年，像一幅属于你的情绪马赛克。AI 情绪洞察自动汇总分析你的情绪数据并给出建议。',
      '还可以一键导出年度报告，回顾这一年的文字与心情。',
    ],
  },
  {
    title: '小慧',
    icon: 'xiaohui-girl',
    paragraphs: [
      '小慧是慧记的 AI 助手，拥有独立的人设与丰富的性格，不是简单的提示词套壳。她温暖治愈，会记住你的重要日子，在特殊时刻给你惊喜；她能读懂你文字背后的情绪，帮你分析最近的心情变化；她可以陪你聊天解闷，也能在你写作卡壳时给灵感和素材。',
      '小慧支持长期记忆，随着使用会越来越了解你。她能检索你过往的记录作为对话上下文，让每次交流都有温度。她还会写时光信，帮你把想说的话寄给未来某个时刻的自己。',
      '小慧提供两种对话场景：日常聊天模式和沉浸书信模式。支持多家 AI 服务商接入（智谱、DeepSeek、OpenAI、豆包、通义、文心等），也提供免费额度开箱即用。个人设置中可精细调整记忆、上下文、回复风格等参数。',
    ],
  },
  {
    title: '悬浮窗',
    icon: 'share',
    paragraphs: [
      '悬浮窗常驻屏幕边缘，随时唤起对话和快捷记录。支持自由拖拽和边缘自动吸附——拖到屏幕边缘会自动收起为一个小巧的图标条，点一下即可展开。',
      '悬浮窗还支持快速输入，直接对小慧说「我现在很烦，记录一篇随笔」或「帮我做一个背单词的备忘」，小慧会帮你完成创建，省去切换页面的步骤。',
    ],
  },
  {
    title: '安全与设置',
    icon: 'shield',
    paragraphs: [
      '慧记提供丰富的自定义设置。外观支持日间与夜间主题切换。编写页的工具栏、词云阈值、日历显示模式等均可自由调整。个人信息设置（昵称、生日、MBTI 等）帮助 AI 更懂你。',
      '隐私方面，数据全部存储在本地设备，支持 PIN 码隐私锁保护。支持 JSON、Markdown、PDF、TXT 多种格式导入导出，可设置定期备份提醒。还可开启每日写日记提醒，养成记录习惯。',
    ],
  },
]

export default function AboutModal({ onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fade-in 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{
          backgroundColor: 'var(--bg)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--rule)' }}
        >
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>关于慧记</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg2)' }}
          >
            <Icon name="close" size={16} color="var(--ink)" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 space-y-6">
          {/* 顶部品牌 */}
          <div className="pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex items-center justify-center" style={{ backgroundColor: '#fff' }}>
                <img src={`${import.meta.env.BASE_URL}icons/icon-512.png`} alt="慧记" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
            <h3 className="text-[18px] font-bold text-center" style={{ color: 'var(--ink)' }}>慧记</h3>
            <p className="text-[12px] mt-1 text-center" style={{ color: 'var(--muted)' }}>AI 情绪感知日记</p>
            <p className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--muted)' }}>v1.0.0</p>
          </div>

          {/* 总览 */}
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink2)' }}>
            慧记是一款 AI 情绪感知日记应用。将传统书写与 AI 深度结合，帮你记录生活、感知情绪、看见内心的轨迹。支持随笔、日记、心情、备忘四种记录方式，配有独立 AI 助手「小慧」，既是你的聊天伙伴，也是你的写作助手和情绪分析师。
          </p>

          {/* 各模块 */}
          {ABOUT_CONTENT.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={section.icon} size={16} color="var(--accent)" />
                <h4 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{section.title}</h4>
              </div>
              {section.paragraphs.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--ink2)' }}>
                  {p}
                </p>
              ))}
            </div>
          ))}

          {/* 联系作者 */}
          <div className="text-center py-4">
            <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--ink)' }}>联系作者</p>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>✉️ 2487054344@qq.com</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
