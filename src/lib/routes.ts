export const BASE_PATH = "/amirfoodanalysis";

export const routes = {
  home: `${BASE_PATH}/`,
  tracker: `${BASE_PATH}/tracker`,
  auth: `${BASE_PATH}/auth`,
  profile: `${BASE_PATH}/profile`,
  onboarding: `${BASE_PATH}/onboarding`,
  diet: `${BASE_PATH}/diet`,
  install: `${BASE_PATH}/install`,
  weeklyChallenge: `${BASE_PATH}/weekly-challenge`,
};

export const withBasePath = (path = "") => `${BASE_PATH}${path}`;
