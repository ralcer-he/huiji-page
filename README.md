# 慧记 - AI 情绪感知日记

一款支持 AI 智能陪伴的情绪感知日记应用，帮助你记录生活点滴、感知情绪变化、实现自我成长。

## 功能特性

- **多维度记录** - 日记、随笔、心情、待办等多种记录方式
- **AI 智能陪伴** - 内置 AI 助手小慧，帮你写日记、分析情绪、提供建议
- **书信空间** - 与小慧的专属书信交流空间
- **情绪统计** - 可视化的情绪变化趋势图表
- **日历视图** - 直观查看每一天的记录情况
- **深色模式** - 支持浅色/深色主题切换
- **多端适配** - Windows 桌面端 + Android 移动端 + 网页版

## 在线试用

**[https://ralcer-he.github.io/huiji/](https://ralcer-he.github.io/huiji/)**

## 技术栈

- React 18 + Vite
- Tailwind CSS
- Tiptap 富文本编辑器
- Recharts 数据可视化
- IndexedDB (Dexie.js) 本地存储
- Capacitor (Android 打包)
- Tauri (Windows 打包)

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/ralcer-he/huiji.git
cd huiji

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5175` 即可。

## 构建与部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### GitHub Pages 部署

1. 进入仓库 Settings → Pages
2. Source 选择 `main` 分支，目录选 `/dist`
3. 点击 Save，等待部署完成

### 打包桌面端

```bash
npm run tauri:build
```

生成的 `.exe` 安装包在 `src-tauri/target/release/` 目录。

### 打包 Android

```bash
npm run cap:sync
npm run cap:build
```

生成的 `.apk` 在 `android/app/build/outputs/apk/release/` 目录。

## 项目结构

```
src/
├── components/    # 组件（首页、编辑器、设置、布局等）
├── pages/         # 页面（首页、编写、日历、统计、小慧等）
├── hooks/         # 自定义 Hooks
├── utils/         # 工具函数
├── constants/     # 常量定义
├── store/         # 全局状态管理
├── db/            # 数据库
├── extensions/    # 编辑器扩展
├── App.jsx        # 根组件
├── main.jsx       # 入口
└── index.css      # 全局样式
```

## 许可证

MIT License
