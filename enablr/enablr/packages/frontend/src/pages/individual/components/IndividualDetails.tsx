import {
  Button,
  Container,
  Form,
  FormField,
  SpaceBetween,
} from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState, useCallback, useContext } from "react";
import { IndividualDto } from "./dto";
import { IndividualsContext } from "../../../context.ts/ThemeContext";
import { REST_API_NAME } from "../../../utils/consts";

/*
Where the individuals details can be view as well as edited by primary users
*/
export const IndividualDetails: React.FC<{ individual: IndividualDto }> = ({
  individual,
}) => {
  const { getSupporterIndividuals } = useContext(IndividualsContext);
  const [editMode, setEditMode] = useState(false);
  const [snapshotDetails, setSnapshotDetails] = useState(individual.details);

  const [firstName, setFirstName] = useState(individual.details.firstName);
  const [lastName, setLastName] = useState(individual.details.lastName);
  const [birthday, setBirthday] = useState(individual.details.birthday);
  const [timezone, setTimezone] = useState(individual.details.tz);
  const [primaryColor, setPrimaryColor] = useState(
    individual.details.primaryColor ?? "#688ae8"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    individual.details.secondaryColor ?? "#c33d69"
  );

  const saveChanges = useCallback(async () => {
    await API.post(REST_API_NAME, `individual/${individual.individual_id}`, {
      body: {
        firstName,
        lastName,
        birthday,
        timezone,
        primaryColor,
        secondaryColor,
      },
    })
      .then(() => {
        setSnapshotDetails({
          firstName,
          lastName,
          birthday,
          tz: timezone,
          primaryColor,
          secondaryColor,
        });
        setEditMode(false);
        getSupporterIndividuals && getSupporterIndividuals();
      })
      .catch((e) => {
        console.error(e);
      });
  }, [firstName, lastName, birthday, timezone, primaryColor, secondaryColor]);

  // Reset all changes to whatever is currently loaded
  const cancelChanges = useCallback(async () => {
    setFirstName(snapshotDetails.firstName);
    setLastName(snapshotDetails.lastName);
    setBirthday(snapshotDetails.birthday);
    setTimezone(snapshotDetails.tz);
    setPrimaryColor(snapshotDetails.primaryColor);
    setSecondaryColor(snapshotDetails.secondaryColor);
    setEditMode(false);
  }, [snapshotDetails]);

  return (
    <Container>
      <h4>Individual details</h4>
      {!editMode ? (
        <SpaceBetween size="s">
          <div>
            <p>{`First Name: ${firstName}`}</p>
            <p>{`Last Name: ${lastName}`}</p>
            <p>{`Birthday: ${birthday}`}</p>
            <p>{`Timezone: ${timezone}`}</p>
            <p>Primary Colour:</p>
            <input type="color" value={primaryColor} readOnly />
            <p>Secondary Colour:</p>
            <input type="color" value={secondaryColor} readOnly />
          </div>
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        </SpaceBetween>
      ) : (
        <Form>
          <SpaceBetween size="m">
            <FormField label="First Name" description="First name of dependant">
              <input
                type="string"
                value={firstName}
                onChange={(x) => setFirstName(x.target.value)}
              />
            </FormField>
            <FormField label="Last Name" description="Last name of dependant">
              <input
                type="string"
                value={lastName}
                onChange={(x) => setLastName(x.target.value)}
              />
            </FormField>
            <FormField label="Birthday" description="Birthday of the dependant">
              <input
                type="date"
                value={birthday}
                onChange={(x) => setBirthday(x.target.value)}
              />
            </FormField>
            {/* todo: make dropdown */}
            <FormField label="Timezone" description="Timezone of the dependant">
              <input
                type="string"
                value={timezone}
                onChange={(x) => setTimezone(x.target.value)}
              />
            </FormField>
            <FormField
              label="Primary Colour"
              description="Primary Colour for graphs and other elements"
            >
              <input
                type="color"
                value={primaryColor}
                onChange={(x) => setPrimaryColor(x.target.value)}
              />
            </FormField>
            <FormField
              label="Secondary Colour"
              description="Secondary Colour for graphs and other elements"
            >
              <input
                type="color"
                value={secondaryColor}
                onChange={(x) => setSecondaryColor(x.target.value)}
              />
            </FormField>

            <SpaceBetween size="m" direction="horizontal">
              <Button onClick={saveChanges}>Save</Button>
              <Button onClick={cancelChanges}>Cancel</Button>
            </SpaceBetween>
          </SpaceBetween>
        </Form>
      )}
    </Container>
  );
};
