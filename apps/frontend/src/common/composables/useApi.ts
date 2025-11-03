import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ref } from 'vue'

// APIベースURL（環境変数に応じて切り替え）
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

let apiClient: AxiosInstance | null = null

// axiosインスタンス生成（シングルトン）
function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // リクエストログ（開発時のみ）
  instance.interceptors.request.use((config) => {
    if (import.meta.env.DEV) {
      console.info('[API Request]', config.method?.toUpperCase(), config.url, config.data)
    }
    return config
  })

  // レスポンスログ＋エラーハンドリング
  instance.interceptors.response.use(
    (response) => {
      if (import.meta.env.DEV) {
        console.info('[API Response]', response.status, response.data)
      }
      return response
    },
    (error) => {
      console.error('[API Error]', error)
      return Promise.reject(error)
    }
  )

  return instance
}

// composableとして公開
export const useApi = () => {
  if (!apiClient) {
    apiClient = createClient()
  }

  // 汎用リクエスト関数
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function request<T = unknown>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T> | null> {
    loading.value = true
    error.value = null

    try {
      const res = await apiClient!.request<T>(config)
      return res
    } catch (err) {
      error.value = err as Error
      return null
    } finally {
      loading.value = false
    }
  }

  // CRUDっぽいショートハンド
  const get = <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ url, method: 'GET', ...config })

  const post = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ url, method: 'POST', data, ...config })

  const put = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ url, method: 'PUT', data, ...config })

  const del = <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ url, method: 'DELETE', ...config })

  return { get, post, put, del, loading, error }
}
