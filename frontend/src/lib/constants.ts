import type { SceneOption } from '@/types'

export const SCENE_OPTIONS: SceneOption[] = [
  {
    id: 'birthday_party',
    label: 'Birthday Party',
    emoji: '🎂',
    description: 'Colorful balloons, cake, and celebration!',
    prompt_hint: 'birthday party, colorful balloons, confetti, celebration cake, festive decorations, warm lighting',
  },
  {
    id: 'cafe',
    label: 'Café',
    emoji: '☕',
    description: 'Cozy café with warm lighting',
    prompt_hint: 'cozy coffee shop, warm ambient lighting, wooden tables, coffee cups, brick walls',
  },
  {
    id: 'beach',
    label: 'Beach',
    emoji: '🏖️',
    description: 'Sunny beach with ocean waves',
    prompt_hint: 'sunny beach, ocean waves, golden sand, blue sky, palm trees, summer',
  },
  {
    id: 'graduation',
    label: 'Graduation',
    emoji: '🎓',
    description: 'Academic ceremony with caps and gowns',
    prompt_hint: 'graduation ceremony, academic robes, mortarboard hats, university campus, celebration',
  },
  {
    id: 'office',
    label: 'Office',
    emoji: '💼',
    description: 'Modern professional workspace',
    prompt_hint: 'modern office, professional setting, glass walls, city view, contemporary design',
  },
  {
    id: 'rooftop',
    label: 'Rooftop',
    emoji: '🌆',
    description: 'Stylish rooftop with city skyline',
    prompt_hint: 'rooftop party, city skyline, golden hour, string lights, urban setting',
  },
  {
    id: 'custom',
    label: 'Custom Scene',
    emoji: '✨',
    description: 'Describe your own scene',
    prompt_hint: '',
  },
]

export const MAX_MEMBERS = 10
export const MIN_MEMBERS_TO_GENERATE = 2
