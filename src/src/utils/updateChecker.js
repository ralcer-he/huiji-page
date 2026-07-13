import { getSetting, saveSetting } from '../db/database'

const CURRENT_VERSION = '1.06.4'
const GITEE_REPO = 'ralcer-he/huiji'
const GITHUB_REPO = 'ralcer-he/huiji'
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24小时检查一次

/**
 * 比较版本号：返回 1(a>b) / 0(相等) / -1(a<b)
 * 支持 "1.06.3" 和 "1.0.6.3" 两种格式
 */
function compareVersions(a, b) {
  // 统一格式：把 "1.06.3" 转成 [1, 6, 3]，把 "1.0.6.3" 转成 [1, 0, 6, 3]
  const normalize = (v) => {
    const parts = v.replace(/^v/, '').split('.').map(Number)
    // 如果是 3 段且中间段 >= 10，说明是 "1.06.3" 格式，转成 "1.6.3"
    if (parts.length === 3 && parts[1] >= 10) {
      parts.splice(1, 1, ...String(parts[1]).split('').map(Number))
    }
    return parts
  }
  const pa = normalize(a)
  const pb = normalize(b)
  const maxLen = Math.max(pa.length, pb.length)
  for (let i = 0; i < maxLen; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * 从 Gitee Releases 获取最新版本号（国内优先，速度快）
 */
async function fetchFromGitee() {
  try {
    const resp = await fetch(
      `https://gitee.com/api/v5/repos/${GITEE_REPO}/releases/latest`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!resp.ok) return null
    const data = await resp.json()
    return {
      tag: data.tag_name,
      name: data.name || data.tag_name,
      body: data.body || '',
      htmlUrl: `https://gitee.com/${GITEE_REPO}/releases`,
      assets: (data.assets || []).map(a => ({
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
      })),
    }
  } catch {
    return null
  }
}

/**
 * 从 GitHub Releases 获取最新版本号（备用）
 */
async function fetchFromGithub() {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!resp.ok) return null
    const data = await resp.json()
    return {
      tag: data.tag_name,
      name: data.name || data.tag_name,
      body: data.body || '',
      htmlUrl: data.html_url,
      assets: (data.assets || []).map(a => ({
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
      })),
    }
  } catch {
    return null
  }
}

/**
 * 获取最新版本：优先 Gitee，失败回退 GitHub
 */
async function fetchLatestVersion() {
  return (await fetchFromGitee()) || (await fetchFromGithub())
}

/**
 * 检查是否有新版本，返回 { hasUpdate, latest } 或 null
 * 有 24 小时缓存，不会频繁请求
 */
export async function checkForUpdate() {
  // 检查上次检查时间
  const lastCheck = await getSetting('updateCheckTime')
  if (lastCheck) {
    const elapsed = Date.now() - lastCheck
    if (elapsed < CHECK_INTERVAL) {
      // 还在缓存期内，读缓存的结果
      const cached = await getSetting('updateResult')
      if (cached) return cached
      return null
    }
  }

  const latest = await fetchLatestVersion()
  if (!latest) return null

  const latestVersion = latest.tag.replace(/^v/, '')
  const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0

  const result = { hasUpdate, latest, currentVersion: CURRENT_VERSION }

  // 缓存结果
  await saveSetting('updateCheckTime', Date.now())
  await saveSetting('updateResult', result)

  return result
}

/**
 * 手动强制检查（忽略缓存）
 */
export async function forceCheckUpdate() {
  await saveSetting('updateCheckTime', 0)
  return checkForUpdate()
}

export { CURRENT_VERSION }
