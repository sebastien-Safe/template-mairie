import { readFileSync } from "fs";
import { join } from "path";

export interface CommuneConfig {
  nom_commune: string;
  siren: string;
  nom_maire: string;
  adresse: string;
  telephone: string;
  email: string;
  nom_domaine: string;
}

const defauts: CommuneConfig = {
  nom_commune: "NOM_COMMUNE",
  siren: "SIREN_COMMUNE",
  nom_maire: "NOM_MAIRE",
  adresse: "ADRESSE_COMMUNE",
  telephone: "TELEPHONE",
  email: "EMAIL_COMMUNE",
  nom_domaine: "NOM_DOMAINE",
};

function chargerConfig(): CommuneConfig {
  const config = { ...defauts };
  try {
    const raw = readFileSync(join(process.cwd(), "src/content/config.md"), "utf-8");
    for (const cle of Object.keys(defauts) as (keyof CommuneConfig)[]) {
      const match = raw.match(new RegExp(`^${cle}:\\s*"([^"]*)"`, "m"));
      if (match && match[1]) config[cle] = match[1];
    }
  } catch {}
  return config;
}

export const commune = chargerConfig();
