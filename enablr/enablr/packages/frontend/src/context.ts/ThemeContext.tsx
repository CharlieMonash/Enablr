import { createContext } from "react";

export const IndividualsContext = createContext<{
  getSupporterIndividuals?: () => void;
}>({});
