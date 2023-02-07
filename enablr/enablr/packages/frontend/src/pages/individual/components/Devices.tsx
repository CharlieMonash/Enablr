import { Button, SpaceBetween } from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState, useEffect, useCallback } from "react";
import { IndividualDto } from "./dto";
import { REST_API_NAME } from "../../../utils/consts";

interface SupporterProps {
  individual: IndividualDto;
}

/*
Devices registered to an individual
They can be viewed and revoked from this component
*/
export const Devices: React.FC<SupporterProps> = ({ individual }) => {
  const [devices, setDevices] = useState<
  {
    device_name: string;
    registration_id: string;
  }[]
  >();

  const revokeAccess = useCallback(
    async (registrationId: string) => {
      const result = await API.post(
        REST_API_NAME,
        `individual/devices/revoke/${individual.individual_id}`,
        {
          body: { registrationId },
        }
      );
      console.log(result);
      setDevices(
        devices?.filter((device) => device.registration_id !== registrationId)
      );
    },
    [devices]
  );

  const loadDevices = async () => {
    const result = await API.get(
      REST_API_NAME,
      `individual/devices/${individual.individual_id}`,
      {}
    );
    console.log(result);
    setDevices(result.devices);
  };

  useEffect(() => {
    loadDevices().catch((e) => console.error(e));
  }, []);

  return (
    <SpaceBetween size="s">
      {devices?.map((device) => (
        <SpaceBetween
          size="s"
          direction="horizontal"
          key={device.registration_id}
        >
          <b>Device Name: {device.device_name}</b>
          <Button onClick={() => revokeAccess(device.registration_id)}>
            Revoke Access
          </Button>
        </SpaceBetween>
      ))}
      <Button
        onClick={() => {
          loadDevices().catch((e) => console.error(e));
          setDevices(undefined);
        }}
      >
        Refresh
      </Button>
    </SpaceBetween>
  );
};
