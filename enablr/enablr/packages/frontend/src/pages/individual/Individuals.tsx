import { Container, Spinner, Tabs } from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState, useEffect, useCallback } from "react";
import { IndividualsContext } from "../../context.ts/ThemeContext";
import { REST_API_NAME } from "../../utils/consts";
import { IndividualDto } from "../individual/components/dto";
import { Individual } from "../individual/Individual";

/*
Loads all the individuals for a supporter and creates a tabbed page for each one.
*/
export const Individuals: React.FC<{ supporterId: string }> = ({
  supporterId,
}) => {
  const [supporterIndividuals, setSupporterIndividuals] = useState<
  | {
    supporterId: string;
    individuals: { relationship: string; individual: IndividualDto }[];
  }
  | undefined
  >();

  // Supporters are loaded here.
  const getSupporterIndividuals = useCallback(() => {
    if (supporterId) {
      API.get(REST_API_NAME, "supporter/individuals", {})
        .then((result) => setSupporterIndividuals(result))
        .catch((e) => console.error(e));
    }
  }, [supporterId]);

  useEffect(() => {
    getSupporterIndividuals();
  }, [supporterId]);

  return (
    // individuals context is needed to pass through data properly from child components when a refresh is needed
    <IndividualsContext.Provider value={{ getSupporterIndividuals }}>
      <Container>
        {supporterIndividuals?.individuals ? (
          <Tabs
            tabs={
              supporterIndividuals?.individuals.map(
                ({ individual, relationship }) => ({
                  label: `${individual.details.firstName} ${individual.details.lastName}`,
                  id: individual.individual_id,
                  content: (
                    <Individual
                      individual={individual}
                      relationship={relationship}
                    />
                  ),
                })
              ) ?? []
            }
          />
        ) : (
          <Spinner />
        )}
      </Container>
    </IndividualsContext.Provider>
  );
};
