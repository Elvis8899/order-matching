import "@shared/utils/config/dotenv";

export const envConfig = {
  isProduction: process.env.NODE_ENV === "production",
};
