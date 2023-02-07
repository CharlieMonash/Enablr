import {
  ExpandableSection,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import { Devices } from "./components/Devices";
import { IndividualDto } from "./components/dto";
import { IndividualDetails } from "./components/IndividualDetails";
import { IndividualTasks } from "./components/IndividualTasks";
import { Registration } from "./components/Registration";
import { Supporters } from "./Supporters";

export const Admin: React.FC<{
  individual: IndividualDto;
}> = ({ individual }) => {
  return (
    <ExpandableSection headerText="Admin" headingTagOverride="h3">
      <SpaceBetween size={"m"}>
        {individual ? (
          <IndividualDetails individual={individual} />
        ) : (
          <Spinner />
        )}
        <ExpandableSection headerText="Tasks" headingTagOverride="h3">
          <IndividualTasks individual={individual} />
        </ExpandableSection>
        <ExpandableSection
          headerText="Other people with access to this individual"
          headingTagOverride="h3"
        >
          <Supporters individual={individual}></Supporters>
        </ExpandableSection>
        <ExpandableSection
          headerText="Register a device with access to this individuals tasks"
          headingTagOverride="h3"
        >
          <Registration individual={individual}></Registration>
        </ExpandableSection>
        <ExpandableSection
          headerText="Manage devices with access to this individual"
          headingTagOverride="h3"
        >
          <Devices individual={individual}></Devices>
        </ExpandableSection>
      </SpaceBetween>
    </ExpandableSection>
  );
};
