import {
  SpaceBetween,
  Button,
  Form,
  FormField,
  Select,
} from "@cloudscape-design/components";
import { OptionDefinition } from "@cloudscape-design/components/internal/components/option/interfaces";
import { API } from "aws-amplify";
import { useState, useEffect, useCallback } from "react";
import { IndividualDto } from "./components/dto";
import { Supporter } from "./components/Supporter";
import { REST_API_NAME } from "../../utils/consts";

/*
Cannot currently create more Primary users
*/
const relationshipOptions = [
  {
    value: "TERTIARY",
    label: "TERTIARY",
  },
  {
    value: "SECONDARY",
    label: "SECONDARY",
  },
];

/*
Supporters who have access to this individual
Some of these api calls could be abstracted back into util functions that make these calls to keep the code cleaner
*/
export const Supporters: React.FC<{
  individual: IndividualDto;
}> = ({ individual }) => {
  const [editMode, setEditMode] = useState(false);
  const [badSupporterMessage, setBadSupporterMessage] = useState<string>();
  const [relationship, setRelationship] = useState<OptionDefinition>(
    relationshipOptions[0]
  );
  const [shareIdentifier, setShareIdentifier] = useState("");
  const [loadedSupporter, setLoadedSupporter] = useState<any>();
  const [supporters, setSupporters] = useState<any[]>([]);

  const loadSupporters = useCallback(() => {
    if (individual) {
      API.get(
        REST_API_NAME,
        `supporter/supporters/${individual.individual_id}`,
        {}
      )
        .then((result) => setSupporters(result.supporters))
        .catch((e) => {
          console.error(e);
        });
    }
  }, [individual]);

  useEffect(() => loadSupporters(), [individual]);

  const lookupSupporter = useCallback(async () => {
    await API.get(
      REST_API_NAME,
      `/supporter/shared-details/${shareIdentifier}`,
      {}
    )
      .then((result) => {
        if (result.invalid) {
          setBadSupporterMessage(
            "No person can be found with this share code. Please check the code and try again"
          );
        } else if (supporters.find((supp) => supp.id === result.id)) {
          setBadSupporterMessage(
            "This person is already a supporter of this individual"
          );
        } else {
          setLoadedSupporter(result);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }, [shareIdentifier]);

  const saveChanges = useCallback(async () => {
    await API.post(
      REST_API_NAME,
      `/supporter/add-supporter/${individual.individual_id}`,
      {
        body: {
          shareIdentifier: shareIdentifier,
          relationship: relationship?.value,
        },
      }
    )
      .then(() => {
        setRelationship(relationshipOptions[0]);
        setShareIdentifier("");
        setLoadedSupporter(undefined);
        setEditMode(false);
        loadSupporters();
      })
      .catch((e) => {
        console.error(e);
      });
  }, [shareIdentifier, relationship]);

  const removeSupporter = useCallback(
    async (supporterId: string) => {
      await API.post(
        REST_API_NAME,
        `/supporter/remove-supporter/${individual.individual_id}`,
        {
          body: {
            supporterId,
          },
        }
      )
        .then(() => {
          loadSupporters();
        })
        .catch((e) => {
          console.error(e);
        });
    },
    [shareIdentifier, relationship]
  );

  // Revert everything to the beginning state
  const cancelChanges = () => {
    setRelationship(relationshipOptions[0]);
    setBadSupporterMessage(undefined);
    setShareIdentifier("");
    setLoadedSupporter(undefined);
    setEditMode(false);
  };

  return (
    <SpaceBetween size={"s"}>
      {supporters
        .filter((supp) => supp.relationship !== "PRIMARY")
        .map((supporter) => (
          <div key={supporter.supporter.id}>
            <Supporter {...supporter} />
            <Button onClick={() => removeSupporter(supporter.supporter.id)}>
              Remove
            </Button>
          </div>
        ))}
      {editMode ? (
        <SpaceBetween size="s">
          <div>
            <Form>
              <FormField
                label="Shared Code"
                description="The share code of the new supporter you are adding. This can be found on their 'my details' page."
              >
                <input
                  type="string"
                  value={shareIdentifier}
                  onChange={(x) => {
                    setShareIdentifier(x.target.value);
                    setLoadedSupporter(undefined);
                    setBadSupporterMessage(undefined);
                  }}
                />
              </FormField>

              <Button onClick={lookupSupporter}>Lookup Supporter</Button>

              {loadedSupporter && (
                <div>
                  <p>
                    {loadedSupporter.firstName} {loadedSupporter.lastName}
                  </p>

                  <FormField
                    label="Relationship"
                    description="A SECONDARY relationship is somebody like a co-parent. A TERTIARY relationship is somebody like an outside carer."
                  >
                    <Select
                      selectedOption={relationship}
                      options={relationshipOptions}
                      onChange={(e) => setRelationship(e.detail.selectedOption)}
                    />
                  </FormField>
                </div>
              )}
              {!!badSupporterMessage && <p>{badSupporterMessage}</p>}
            </Form>
          </div>
          <SpaceBetween size="m" direction="horizontal">
            <Button onClick={saveChanges} disabled={!loadedSupporter}>
              Save
            </Button>
            <Button onClick={cancelChanges}>Cancel</Button>
          </SpaceBetween>
        </SpaceBetween>
      ) : (
        <Button onClick={() => setEditMode(true)}>Add Supporter</Button>
      )}
    </SpaceBetween>
  );
};
