import { Button, SpaceBetween } from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState } from "react";
import QRCode from "react-qr-code";
import { IndividualDto } from "./dto";
import { REST_API_NAME } from "../../../utils/consts";

interface SupporterProps {
  individual: IndividualDto;
}

/*
This component gets a registration code from the individuals api and presents it as a QR code to be scanned.
*/
export const Registration: React.FC<SupporterProps> = ({ individual }) => {
  const [registrationId, setRegistrationID] = useState<string>();

  const createRegistrationId = async () => {
    const result = await API.get(
      REST_API_NAME,
      `individual/register-device/${individual.individual_id}`,
      {}
    );
    setRegistrationID(result.registrationId);
  };

  return (
    <SpaceBetween size="s">
      {!!registrationId && (
        <SpaceBetween size="s">
          <div style={{ background: "white", padding: "16px" }}>
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: 256, width: 256 }}
              value={registrationId}
            />
          </div>
          {registrationId}
        </SpaceBetween>
      )}
      <Button onClick={createRegistrationId}>Register new Device</Button>
    </SpaceBetween>
  );
};
