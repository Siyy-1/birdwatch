const easProjectId = process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID
const expoOwner = process.env.EXPO_OWNER

module.exports = ({ config }) => {
  const extra = {
    ...(config.extra ?? {}),
    router: {
      ...(config.extra?.router ?? {}),
      origin: false,
    },
  }

  if (easProjectId) {
    extra.eas = { projectId: easProjectId }
  }

  const nextConfig = {
    ...config,
    extra,
  }

  if (expoOwner) {
    nextConfig.owner = expoOwner
  }

  if (easProjectId) {
    nextConfig.updates = {
      ...(config.updates ?? {}),
      url: `https://u.expo.dev/${easProjectId}`,
    }
  }

  return nextConfig
}
