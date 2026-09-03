import { useState } from 'react'

// Map of canonical brand SVG paths
export const BRAND_ICONS = {
  github: {
    name: 'GitHub',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
    color: '#ffffff',
    bg: '#24292e',
  },
  google: {
    name: 'Google',
    svg: (
      <svg viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z" />
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
      </svg>
    ),
    bg: '#1a1d24',
  },
  microsoft: {
    name: 'Microsoft',
    svg: (
      <svg viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    ),
    bg: '#1e293b',
  },
  aws: {
    name: 'Amazon AWS',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.8 17.5c-3.7 2.7-9 3.6-13.7 1.2-.6-.3-.7-1.1-.1-1.5.3-.2.8-.2 1.1 0 4.1 2.1 8.8 1.3 12.1-1.1.5-.4 1.1.3.6 1.4zm2.1-1.5c-.5-.6-3.1-.7-4.4-.6-.4 0-.6-.4-.3-.7 1.8-1.5 4.8-.4 5.3.2.5.6-.1 3.5-1.9 4.8-.3.2-.7 0-.6-.4.4-1.2 1.9-3.3 1.9-3.3zm-6.1-5.6V7.7c0-.4-.3-.7-.7-.7h-1.5c-.4 0-.7.3-.7.7v2.7c-1-.7-2.3-1.1-3.6-1.1-3.5 0-5.8 2.6-5.8 5.9 0 3.2 2.2 5.5 5.5 5.5 1.5 0 2.8-.5 3.9-1.4v.7c0 .4.3.7.7.7h1.5c.4 0 .7-.3.7-.7v-11z" />
      </svg>
    ),
    color: '#FF9900',
    bg: '#232f3e',
  },
  discord: {
    name: 'Discord',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.01 14.361 14.361 0 0012.115 0 .075.075 0 01.078.01c.12.098.246.194.373.288a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.893.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    color: '#5865F2',
    bg: '#1e1f29',
  },
  twitter: {
    name: 'X (Twitter)',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: '#ffffff',
    bg: '#000000',
  },
  apple: {
    name: 'Apple',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.64 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.05-.49 2.66-1.24" />
      </svg>
    ),
    color: '#ffffff',
    bg: '#18181b',
  },
  gitlab: {
    name: 'GitLab',
    svg: (
      <svg viewBox="0 0 24 24">
        <path fill="#E24329" d="M12 21.43l4.31-13.27H7.69L12 21.43z" />
        <path fill="#FC6D26" d="M12 21.43l-4.31-13.27H1.54l10.46 13.27z" />
        <path fill="#FCA326" d="M1.54 8.16l-.98 3.01a1.07 1.07 0 00.39 1.2L12 21.43 1.54 8.16z" />
        <path fill="#E24329" d="M1.54 8.16h6.15L5.42 1.17a.54.54 0 00-1.03 0L1.54 8.16z" />
        <path fill="#FC6D26" d="M12 21.43l4.31-13.27h6.15L12 21.43z" />
        <path fill="#FCA326" d="M22.46 8.16l.98 3.01a1.07 1.07 0 01-.39 1.2L12 21.43l10.46-13.27z" />
        <path fill="#E24329" d="M22.46 8.16h-6.15l2.27-6.99a.54.54 0 011.03 0l2.85 6.99z" />
      </svg>
    ),
    bg: '#201826',
  },
  slack: {
    name: 'Slack',
    svg: (
      <svg viewBox="0 0 24 24">
        <path fill="#E01E5A" d="M5.04 14.5a2.52 2.52 0 11-2.52-2.52h2.52v2.52zm1.26 0a2.52 2.52 0 015.04 0v6.3a2.52 2.52 0 11-5.04 0v-6.3z" />
        <path fill="#36C5F0" d="M9.5 5.04a2.52 2.52 0 112.52-2.52v2.52H9.5zm0 1.26a2.52 2.52 0 010 5.04H3.2a2.52 2.52 0 110-5.04H9.5z" />
        <path fill="#2EB67D" d="M18.96 9.5a2.52 2.52 0 112.52 2.52h-2.52V9.5zm-1.26 0a2.52 2.52 0 01-5.04 0V3.2a2.52 2.52 0 115.04 0v6.3z" />
        <path fill="#ECB22E" d="M14.5 18.96a2.52 2.52 0 11-2.52 2.52v-2.52h2.52zm0-1.26a2.52 2.52 0 010-5.04h6.3a2.52 2.52 0 110 5.04h-6.3z" />
      </svg>
    ),
    bg: '#1b1b24',
  },
  binance: {
    name: 'Binance',
    svg: (
      <svg viewBox="0 0 24 24" fill="#F0B90B">
        <path d="M12 0L5.34 6.66l2.13 2.13L12 4.26l4.53 4.53 2.13-2.13L12 0zm-6.66 8.8L0 14.13 2.13 16.27 7.47 10.93 5.34 8.8zm13.32 0l-2.13 2.13 5.34 5.34L24 14.13l-5.34-5.33zM12 8.52l-3.48 3.48 3.48 3.48 3.48-3.48L12 8.52zm-6.66 9.61L7.47 16l-2.13-2.13L0 19.2l5.34 5.34 2.13-2.13-2.13-4.28zm13.32 0l-2.13 2.13 2.13 4.28 5.34-5.34-5.34-5.33-2.13 2.13 2.13 2.13zM12 17.07l-4.53 4.53L12 24l4.53-2.4-4.53-4.53z" />
      </svg>
    ),
    bg: '#181a20',
  },
  coinbase: {
    name: 'Coinbase',
    svg: (
      <svg viewBox="0 0 24 24" fill="#0052FF">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18a6 6 0 110-12 6 6 0 010 12z" />
      </svg>
    ),
    bg: '#0c1b33',
  },
  openai: {
    name: 'OpenAI / ChatGPT',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.98 4.181a5.984 5.984 0 00-3.998 3.778 6.046 6.046 0 00.742 7.135 5.985 5.985 0 00.516 4.91 6.046 6.046 0 006.51 2.9A6.066 6.066 0 0019.02 20.82a5.984 5.984 0 003.998-3.778 6.046 6.046 0 00-.736-7.221zM12.001 14.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      </svg>
    ),
    color: '#10a37f',
    bg: '#142721',
  },
  reddit: {
    name: 'Reddit',
    svg: (
      <svg viewBox="0 0 24 24" fill="#FF4500">
        <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701z" />
      </svg>
    ),
    bg: '#261a15',
  },
  steam: {
    name: 'Steam',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.385 3.385 0 012.073-.703c.121 0 .24.007.357.02l2.971-4.307a4.57 4.57 0 01-.061-.741c0-2.535 2.063-4.6 4.6-4.6 2.536 0 4.6 2.065 4.6 4.6 0 2.536-2.064 4.6-4.6 4.6-.263 0-.518-.023-.767-.066l-4.27 3.01c.01.107.018.214.018.324a3.393 3.393 0 01-3.393 3.394 3.407 3.407 0 01-3.381-3.084L.28 14.155A12.012 12.012 0 1011.98 0z" />
      </svg>
    ),
    color: '#66c0f4',
    bg: '#171a21',
  },
  notion: {
    name: 'Notion',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 4.39v12.515c0 .747.373 1.027 1.214.98l14.475-.84c.84-.047.933-.56.933-1.167V5.516c0-.607-.233-.934-.793-.887l-15.035.887c-.607.047-.794.42-.794.98zm13.493.56c.093.42 0 .84-.42.887l-.7.14v8.592c-.373.233-.793.373-1.214.373-.653 0-.933-.233-1.494-.933l-4.576-7.144v6.864l1.354.327c.047.42-.234.793-.7.793l-3.315.187c-.093-.187 0-.607.374-.654l.887-.233V9.814l-1.214-.14c-.093-.42.14-.84.607-.887l3.596-.233 4.81 7.284v-6.35l-1.214-.14c-.093-.42.14-.84.607-.887z" />
      </svg>
    ),
    color: '#ffffff',
    bg: '#191919',
  },
  spotify: {
    name: 'Spotify',
    svg: (
      <svg viewBox="0 0 24 24" fill="#1ED760">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
    bg: '#121212',
  },
  stripe: {
    name: 'Stripe',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C17.756.845 15.362.464 12.521.464 6.745.464 2.8 3.513 2.8 8.851c0 6.643 7.82 5.86 7.82 8.795 0 1.01-.84 1.488-2.188 1.488-2.617 0-5.467-1.196-7.391-2.274l-.889 5.539c1.942 1.045 4.908 1.637 8.01 1.637 6.055 0 10.088-2.923 10.088-8.397 0-6.938-7.989-6.07-7.989-8.794z" />
      </svg>
    ),
    color: '#635BFF',
    bg: '#1b1b2d',
  },
  cloudflare: {
    name: 'Cloudflare',
    svg: (
      <svg viewBox="0 0 24 24" fill="#F38020">
        <path d="M18.243 14.168a3.784 3.784 0 00.32-1.528c0-2.091-1.696-3.788-3.788-3.788-.475 0-.923.09-1.336.25a5.556 5.556 0 00-5.116-3.414c-2.735 0-5.011 1.97-5.474 4.588A4.184 4.184 0 000 14.39C0 16.716 1.884 18.6 4.21 18.6h14.033A3.757 3.757 0 0022 14.843c0-.236-.022-.468-.065-.694-.537.01-1.127.019-1.692.019z" />
      </svg>
    ),
    bg: '#251b14',
  },
  bitwarden: {
    name: 'Bitwarden',
    svg: (
      <svg viewBox="0 0 24 24" fill="#175DDC">
        <path d="M12 0L1.6 3.8v7.8c0 7.4 4.4 14.3 10.4 16.4 6-2.1 10.4-9 10.4-16.4V3.8L12 0zm0 3.3l7.4 2.7v5.6c0 5.8-3.3 11.2-7.4 13.1-4.1-1.9-7.4-7.3-7.4-13.1V6l7.4-2.7z" />
      </svg>
    ),
    bg: '#101d36',
  },
  proton: {
    name: 'Proton',
    svg: (
      <svg viewBox="0 0 24 24" fill="#6D4AFF">
        <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12S6.2 22.5 12 22.5 22.5 17.8 22.5 12 17.8 1.5 12 1.5zm0 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
      </svg>
    ),
    bg: '#1c1630',
  },
  generic: {
    name: 'Key / Auth',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    color: '#818cf8',
    bg: '#1e293b',
  },
}

// Auto-detection rules
const MATCH_RULES = [
  { match: /github/i, key: 'github' },
  { match: /google|gmail|workspace/i, key: 'google' },
  { match: /microsoft|azure|outlook|office365|live\.com/i, key: 'microsoft' },
  { match: /aws|amazon/i, key: 'aws' },
  { match: /discord/i, key: 'discord' },
  { match: /twitter|x\.com/i, key: 'twitter' },
  { match: /apple|icloud/i, key: 'apple' },
  { match: /gitlab/i, key: 'gitlab' },
  { match: /slack/i, key: 'slack' },
  { match: /binance/i, key: 'binance' },
  { match: /coinbase/i, key: 'coinbase' },
  { match: /openai|chatgpt/i, key: 'openai' },
  { match: /reddit/i, key: 'reddit' },
  { match: /steam/i, key: 'steam' },
  { match: /notion/i, key: 'notion' },
  { match: /spotify/i, key: 'spotify' },
  { match: /stripe/i, key: 'stripe' },
  { match: /cloudflare/i, key: 'cloudflare' },
  { match: /bitwarden/i, key: 'bitwarden' },
  { match: /proton/i, key: 'proton' },
]

export function detectService(nameOrIssuer = '') {
  if (!nameOrIssuer) return null
  for (const { match, key } of MATCH_RULES) {
    if (match.test(nameOrIssuer)) return key
  }
  return null
}

// Generate deterministic vibrant gradient background for monogram avatars
const GRADIENTS = [
  ['#4f46e5', '#7c3aed'],
  ['#2563eb', '#06b6d4'],
  ['#059669', '#10b981'],
  ['#d97706', '#f59e0b'],
  ['#dc2626', '#f43f5e'],
  ['#db2777', '#c026d3'],
  ['#0891b2', '#3b82f6'],
  ['#7c2d12', '#ea580c'],
]

function getGradient(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % GRADIENTS.length
  return `linear-gradient(135deg, ${GRADIENTS[idx][0]}, ${GRADIENTS[idx][1]})`
}

function getInitials(str = '') {
  const clean = str.trim().replace(/^https?:\/\//i, '')
  if (!clean) return '•'
  const parts = clean.split(/[\s:_-]+/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

export function ServiceLogo({
  logo,
  issuer = '',
  label = '',
  size = 38,
  className = '',
  style = {},
}) {
  const [imgError, setImgError] = useState(false)

  // 1. If explicit URL / data URI
  const isUrl = logo && (logo.startsWith('http') || logo.startsWith('data:'))
  if (isUrl && !imgError) {
    return (
      <div
        className={`service-logo ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          ...style,
        }}
      >
        <img
          src={logo}
          alt={issuer || label}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    )
  }

  // 2. Check preset key or auto-detect
  const brandKey = BRAND_ICONS[logo]
    ? logo
    : detectService(issuer) || detectService(label)

  if (brandKey && BRAND_ICONS[brandKey]) {
    const brand = BRAND_ICONS[brandKey]
    return (
      <div
        className={`service-logo ${className}`}
        title={brand.name}
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: brand.bg || 'var(--panel-2)',
          color: brand.color || 'var(--text)',
          border: '1px solid var(--border)',
          padding: size * 0.18,
          ...style,
        }}
      >
        {brand.svg}
      </div>
    )
  }

  // 3. Monogram fallback avatar
  const displayName = issuer || label || '2FA'
  const initials = getInitials(displayName)
  const bg = getGradient(displayName)

  return (
    <div
      className={`service-logo monogram ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: '#ffffff',
        fontWeight: 700,
        fontSize: size * 0.38,
        letterSpacing: -0.5,
        userSelect: 'none',
        border: '1px solid rgba(255,255,255,0.15)',
        ...style,
      }}
    >
      {initials}
    </div>
  )
}
