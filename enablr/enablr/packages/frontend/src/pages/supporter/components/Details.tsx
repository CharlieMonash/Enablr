import { Button } from "@cloudscape-design/components";

/*
Abstracted component to render the details of the supporter.
*/
export const Details: React.FC<{ supporter: any }> = ({ supporter }) => {
  return (
    <div>
      <b>Name:</b>
      <p>
        {supporter.details.firstName} {supporter.details.lastName}
      </p>
      {supporter.shareIdentifier && (
        <div>
          <b>Share code:</b>
          <p>{supporter.shareIdentifier}</p>
          <Button
            onClick={() =>
              navigator.clipboard.writeText(supporter.shareIdentifier)
            }
          >
            Copy
          </Button>
        </div>
      )}
    </div>
  );
};
