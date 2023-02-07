import { SpaceBetween } from "@cloudscape-design/components";
import { Admin } from "./Admin";
import { IndividualDto } from "./components/dto";
import { Stats } from "./Stats";

/*
The base page for each individual tab.
Admin section only loads if the individual is a primary user.
*/
export const Individual: React.FC<{
  individual: IndividualDto;
  relationship: string;
}> = ({ individual, relationship }) => {
  return (
    <SpaceBetween size={"m"}>
      <h3>Relationship: {relationship}</h3>
      <Stats individual={individual} />
      {relationship === "PRIMARY" && <Admin individual={individual} />}
    </SpaceBetween>
  );
};
