import { readFileSync } from "fs";
import { join } from "path";

export type StyleSite = "style1" | "style2" | "style3";

export interface CommuneConfig {
  nom_commune: string;
  siren: string;
  nom_maire: string;
  adresse: string;
  telephone: string;
  email: string;
  nom_domaine: string;
  style: StyleSite;
}

const defauts: CommuneConfig = {
  nom_commune: "NOM_COMMUNE",
  siren: "SIREN_COMMUNE",
  nom_maire: "NOM_MAIRE",
  adresse: "ADRESSE_COMMUNE",
  telephone: "TELEPHONE",
  email: "EMAIL_COMMUNE",
  nom_domaine: "NOM_DOMAINE",
  style: "style1",
};

const STYLES_VALIDES: StyleSite[] = ["style1", "style2", "style3"];

function chargerConfig(): CommuneConfig {
  const config: Record<string, string> = { ...defauts };
  try {
    const raw = readFileSync(join(process.cwd(), "src/content/config.md"), "utf-8");
    for (const cle of Object.keys(defauts) as (keyof CommuneConfig)[]) {
      const match = raw.match(new RegExp(`^${cle}:\\s*"([^"]*)"`, "m"));
      if (match && match[1]) config[cle] = match[1];
    }
  } catch {}
  if (!STYLES_VALIDES.includes(config.style as StyleSite)) config.style = defauts.style;
  return config as unknown as CommuneConfig;
}

export const commune = chargerConfig();

export interface IdentiteVisuelle {
  logo: string;
  photo_mairie: string;
}

const defautsIdentite: IdentiteVisuelle = {
  logo: "",
  photo_mairie: "",
};

function chargerIdentite(): IdentiteVisuelle {
  const identite = { ...defautsIdentite };
  try {
    const raw = readFileSync(join(process.cwd(), "src/content/identite.md"), "utf-8");
    for (const cle of Object.keys(defautsIdentite) as (keyof IdentiteVisuelle)[]) {
      const match = raw.match(new RegExp(`^${cle}:\\s*"([^"]*)"`, "m"));
      if (match && match[1]) identite[cle] = match[1];
    }
  } catch {}
  return identite;
}

export const identite = chargerIdentite();
