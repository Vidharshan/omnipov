import { google } from 'googleapis'

export function getOAuth2Client(providerToken?: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/callback`
  )

  const credentials: any = {}
  if (providerToken) credentials.access_token = providerToken
  if (refreshToken && refreshToken !== 'token') credentials.refresh_token = refreshToken

  if (Object.keys(credentials).length > 0) {
    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}

export async function getDriveStorageQuota(auth: any) {
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.about.get({
    fields: 'storageQuota',
  })
  return res.data.storageQuota
}

export async function createEventFolder(auth: any, folderName: string) {
  const drive = google.drive({ version: 'v3', auth })
  
  // 1. Create Folder
  const fileMetadata = {
    name: `POV-Snap - ${folderName}`,
    mimeType: 'application/vnd.google-apps.folder',
  }
  
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  })

  const folderId = folder.data.id!

  // 2. Make folder readable by anyone with the link so guests can view videos in gallery
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return {
    folderId,
    webViewLink: folder.data.webViewLink,
  }
}
