import {
  SpaceBetween,
  Alert,
  ExpandableSection,
} from "@cloudscape-design/components";
import { ReminderDTO } from "./dto";

/*
A set of alerts for overdue reminders. Auto expands if there are any to see.
*/
export const OverdueReminders: React.FC<{ reminders?: ReminderDTO[][] }> = ({
  reminders,
}) => {
  const overdueReminders = reminders
    ?.filter((reminder) => reminder.length)
    .map((reminder) => (
      <SpaceBetween size="s" key={reminder[0].reminder_id}>
        {reminder
          .filter((rem) => rem.due < Date.now() && !rem.completed)
          .map((rem: ReminderDTO) => (
            <Alert
              key={rem.due}
              header="Overdue reminder"
              type="error"
              statusIconAriaLabel="info"
            >
              {rem.details.name} {new Date(rem.due).toLocaleString()}
            </Alert>
          ))}
      </SpaceBetween>
    ));
  return (
    <ExpandableSection
      headerText="Overdue Today"
      defaultExpanded={!!overdueReminders?.length}
    >
      <SpaceBetween size="m">
        {!!overdueReminders?.length
          ? overdueReminders
          : "No overdue reminders for this time period"}
      </SpaceBetween>
    </ExpandableSection>
  );
};
