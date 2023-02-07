export const Reminder: React.FC<{ reminders: any[] }> = ({ reminders }) => {
  return (
    <div>
      {reminders.map((reminder) => (
        <div key={`${reminder.reminder_id}-${reminder.due}`}>
          <p>{new Date(reminder.due * 1000).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};
