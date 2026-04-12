/**
 * photoPipeline.ts — 사진 업로드 및 AI 식별 공통 파이프라인
 */
import * as FileSystem from 'expo-file-system'
import { apiClient } from '../api'
import type { AiIdentifyResult } from '../../types/api'

export interface UploadablePhoto {
  uri: string
  mimeType: string
}

export async function uploadPhotoAsset(photo: UploadablePhoto): Promise<{ s3Key: string }> {
  const { data: presignData } = await apiClient.post<{ data: { upload_url: string; s3_key: string } }>(
    '/api/v1/upload/presign',
    { content_type: photo.mimeType },
  )
  const { upload_url, s3_key } = presignData.data

  const isLocalUploadUrl = upload_url.includes('localhost') || upload_url.includes('127.0.0.1')

  if (isLocalUploadUrl) {
    const base64 = await FileSystem.readAsStringAsync(photo.uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    await apiClient.post(upload_url, { s3_key, data: base64 })
  } else {
    const uploadResult = await FileSystem.uploadAsync(upload_url, photo.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': photo.mimeType,
      },
    })

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(`S3 upload failed with status ${uploadResult.status}`)
    }
  }

  return { s3Key: s3_key }
}

export async function identifyPhotoByS3Key(s3Key: string): Promise<AiIdentifyResult> {
  const { data } = await apiClient.post<{ data: AiIdentifyResult }>(
    '/api/v1/ai/identify',
    { s3_key: s3Key },
  )

  return data.data
}
