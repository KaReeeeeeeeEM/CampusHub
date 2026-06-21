export const KIBO_BASE_PATH = "/assets/kibo" as const;

export const kiboExpressions = {
  idle: `${KIBO_BASE_PATH}/expressions/idle.svg`,
  happy: `${KIBO_BASE_PATH}/expressions/happy.svg`,
  excited: `${KIBO_BASE_PATH}/expressions/excited.svg`,
  celebrating: `${KIBO_BASE_PATH}/expressions/celebrating.svg`,
  thinking: `${KIBO_BASE_PATH}/expressions/thinking.svg`,
  curious: `${KIBO_BASE_PATH}/expressions/curious.svg`,
  concerned: `${KIBO_BASE_PATH}/expressions/concerned.svg`,
  sleeping: `${KIBO_BASE_PATH}/expressions/sleeping.svg`,
  waving: `${KIBO_BASE_PATH}/expressions/waving.svg`,
  pointing: `${KIBO_BASE_PATH}/expressions/pointing.svg`,
  clapping: `${KIBO_BASE_PATH}/expressions/clapping.svg`,
  peek: `${KIBO_BASE_PATH}/expressions/peek.svg`,
} as const;

export const kiboAnimations = {
  idle: {
    fallback: `${KIBO_BASE_PATH}/idle/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/idle/kibo.riv`,
  },
  wave: {
    fallback: `${KIBO_BASE_PATH}/wave/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/wave/kibo.riv`,
  },
  peek: {
    fallback: `${KIBO_BASE_PATH}/peek/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/peek/kibo.riv`,
  },
  celebrate: {
    fallback: `${KIBO_BASE_PATH}/celebrate/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/celebrate/kibo.riv`,
  },
  thinking: {
    fallback: `${KIBO_BASE_PATH}/thinking/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/thinking/kibo.riv`,
  },
  sleeping: {
    fallback: `${KIBO_BASE_PATH}/sleeping/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/sleeping/kibo.riv`,
  },
  pointing: {
    fallback: `${KIBO_BASE_PATH}/pointing/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/pointing/kibo.riv`,
  },
  clapping: {
    fallback: `${KIBO_BASE_PATH}/clapping/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/clapping/kibo.riv`,
  },
  streak_warning: {
    fallback: `${KIBO_BASE_PATH}/streak_warning/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/streak_warning/kibo.riv`,
  },
  achievement_unlock: {
    fallback: `${KIBO_BASE_PATH}/achievement_unlock/kibo.svg`,
    rive: `${KIBO_BASE_PATH}/achievement_unlock/kibo.riv`,
  },
} as const;

export type KiboExpression = keyof typeof kiboExpressions;
export type KiboAnimation = keyof typeof kiboAnimations;

export function getKiboExpressionAsset(expression: KiboExpression) {
  return kiboExpressions[expression];
}

export function getKiboAnimationAsset(animation: KiboAnimation) {
  return kiboAnimations[animation];
}
