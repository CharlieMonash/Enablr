import { Details } from "../../supporter/components/Details";

interface SupporterProps {
  supporter: any;
  relationship: string;
}

export const Supporter: React.FC<SupporterProps> = ({
  supporter,
  relationship,
}) => {
  return (
    <div key={supporter.supporter_id}>
      <Details supporter={supporter} />
      <p>Relationship: {relationship}</p>
    </div>
  );
};
