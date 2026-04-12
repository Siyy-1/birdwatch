/**
 * imageSanitizer.ts — 업로드 전 이미지 민감 메타데이터 제거
 *
 * expo-image-manipulator로 이미지를 재인코딩해 EXIF/GPS 메타데이터를 제거한다.
 * 서버/Lambda 측 제거와 함께 defense in depth를 구성한다.
 */
import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'

export interface SanitizedImage {
  uri: string
  mimeType: 'image/jpeg'
}

export async function sanitizeImageForUpload(uri: string): Promise<SanitizedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  )

  return {
    uri: result.uri,
    mimeType: 'image/jpeg',
  }
}

export async function persistSanitizedImageForQueue(uri: string): Promise<SanitizedImage> {
  const sanitized = await sanitizeImageForUpload(uri)
  const queueDir = `${FileSystem.documentDirectory}offline-queue`
  const targetUri = `${queueDir}/${Date.now()}.jpg`

  await FileSystem.makeDirectoryAsync(queueDir, { intermediates: true })
  await FileSystem.copyAsync({
    from: sanitized.uri,
    to: targetUri,
  })

  return {
    uri: targetUri,
    mimeType: sanitized.mimeType,
  }
}
