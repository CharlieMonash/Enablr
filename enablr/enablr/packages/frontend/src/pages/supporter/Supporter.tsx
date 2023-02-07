import { Container, Header, SpaceBetween } from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState, useEffect } from "react";
import { Details } from "./components/Details";
import { REST_API_NAME } from "../../utils/consts";

/*
The current user has their details loaded via this page
*/
export const Supporter: React.FC<{ supporterId: string }> = ({
  supporterId,
}) => {
  const [details, setDetails] = useState<any>();

  useEffect(() => {
    if (supporterId) {
      API.get(REST_API_NAME, "supporter/details", {})
        .then((result) => setDetails(result))
        .catch((e) => console.error(e));
    }
  }, [supporterId]);

  return (
    <SpaceBetween size="l" direction="horizontal">
      <Container header={<Header variant={"h3"}>Supporter Details</Header>}>
        {(!!details && <Details supporter={details} />) ?? "Loading details"}
      </Container>
    </SpaceBetween>
  );
};
