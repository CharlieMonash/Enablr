import {
  BarChart,
  Button,
  ExpandableSection,
  MixedLineBarChart,
  SpaceBetween,
  Spinner,
  Tabs,
} from "@cloudscape-design/components";
import { API } from "aws-amplify";
import { useState, useEffect } from "react";
import { IndividualDto, ReminderDTO } from "./components/dto";
import { OverdueReminders } from "./components/OverdueReminders";
import { REST_API_NAME } from "../../utils/consts";

type Scale = "WEEK" | "MONTH" | "DAY" | "ONLY_PAST_DAY";

/* Util function for the history view, grouping reminders by day to allow for a better graph experience.
A large bulk of this component involves graphs and could be abstracted out further
 */
const groupReminderByDay = (reminders: ReminderDTO[]) => {
  if (!reminders.length) return [];
  const groupedReminders: { [id: string]: ReminderDTO[] } = {};

  reminders.forEach((reminder) => {
    const newDate = new Date(reminder.due);
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    reminder.due = newDate.getTime();

    const grouped: ReminderDTO[] =
      groupedReminders[reminder.due.toString()] ?? [];
    grouped.push(reminder);
    groupedReminders[reminder.due.toString()] = grouped;
  });

  const result = [];

  for (let key of Object.keys(groupedReminders)) {
    result.push({
      due: key,
      reminders: groupedReminders[key],
    });
  }

  return result;
};

/*
The stats component displays graphs, overdue notices and notes left throughout the day.
*/
export const Stats: React.FC<{
  individual: IndividualDto;
}> = ({ individual }) => {
  const [reminders, setReminders] = useState<ReminderDTO[][]>();
  const [scale, setScale] = useState<Scale>("ONLY_PAST_DAY");
  const [refresh, setRefresh] = useState(false);

  // Get all the tasks for x scale (today, month, week)
  const getAllTasks = async (ind: IndividualDto, s: Scale) => {
    const beginningDate = new Date();
    switch (s) {
      case "WEEK":
        beginningDate.setDate(beginningDate.getDate() - 7);
        break;
      case "MONTH":
        beginningDate.setMonth(beginningDate.getMonth() - 1);
        break;
    }
    // Zero anything lower than the day
    beginningDate.setHours(0);
    beginningDate.setMinutes(0);
    beginningDate.setSeconds(0);
    // There may be many calls here, this process is parallelised for a better user experience
    const promises = ind.tasks.map(
      (task) =>
        new Promise<ReminderDTO[]>((res) => {
          API.get(
            REST_API_NAME,
            `individual/reminders/${individual.individual_id}/${
              individual.individual_id
            }-${task.task_id}/${beginningDate.getTime()}`,
            {}
          )
            .then((result) =>
              res(
                result.reminders
                  .map((r: ReminderDTO) => ({
                    ...r,
                    ...task,
                    due: parseInt(r.due as any) * 1000,
                  }))
                  .filter((r: any) =>
                    scale !== "ONLY_PAST_DAY" ? true : r.due <= Date.now()
                  )
              )
            )
            .catch((e) => {
              console.error(e);
            });
        })
    );

    const results: ReminderDTO[][] = await Promise.all(promises);
    setReminders(results);
  };

  // if the individual changes when selected, get their data
  useEffect(() => {
    if (individual) {
      getAllTasks(individual, scale).catch((e) => console.log(e));
    }
  }, [individual, scale, refresh]);

  // Format reminders. Abstract to reminder component
  const reminderNotes = reminders
    ?.filter((reminder) => reminder.length)
    .map((reminder) => (
      <div key={reminder[0].reminder_id}>
        {reminder
          .filter((rem) => rem.note !== "")
          .map((rem: ReminderDTO) => (
            <div key={rem.due}>
              <p key={rem.reminder_id}>
                {rem.details.name} {new Date(rem.due).toLocaleString()}
              </p>
              <p>{rem.note}</p>
            </div>
          ))}
      </div>
    ));

  return (
    <ExpandableSection
      headerText="Stats"
      headingTagOverride="h3"
      defaultExpanded
    >
      {(scale === "ONLY_PAST_DAY" || scale === "DAY") && (
        <OverdueReminders reminders={reminders} />
      )}
      {reminders ? (
        <SpaceBetween size="m">
          <SpaceBetween size="s" direction="horizontal">
            <Button
              onClick={() => {
                if (scale !== "ONLY_PAST_DAY") {
                  setReminders([]);
                  setScale("ONLY_PAST_DAY");
                }
              }}
              variant={scale === "ONLY_PAST_DAY" ? "primary" : "normal"}
            >
              Today So Far
            </Button>
            <Button
              onClick={() => {
                if (scale !== "DAY") {
                  setReminders([]);
                  setScale("DAY");
                }
              }}
              variant={scale === "DAY" ? "primary" : "normal"}
            >
              Today Total
            </Button>
            <Button
              onClick={() => {
                if (scale !== "WEEK") {
                  setReminders([]);
                  setScale("WEEK");
                }
              }}
              variant={scale === "WEEK" ? "primary" : "normal"}
            >
              Week
            </Button>
            <Button
              onClick={() => {
                if (scale !== "MONTH") {
                  setReminders([]);
                  setScale("MONTH");
                }
              }}
              variant={scale === "MONTH" ? "primary" : "normal"}
            >
              Month
            </Button>
          </SpaceBetween>
          <BarChart
            series={[
              {
                title: "Task completion",
                type: "bar",
                data: reminders
                  .filter((reminder) => reminder.length)
                  .map((reminder) => ({
                    x: reminder[0].details.name,
                    y: reminder.reduce(
                      (x: number, r: any) => (r.completed ? 1 + x : x),
                      0
                    ),
                  })),
                color: individual.details.primaryColor,
              },
              {
                title: "Task Target",
                type: "bar",
                data: reminders
                  .filter((reminder) => reminder.length)
                  .map((reminder) => ({
                    x: reminder[0].details.name,
                    y: reminder.length,
                  })),
                color: individual.details.secondaryColor,
              },
            ]}
            hideFilter
            ariaLabel="Chart for displaying rates of task completion by task"
            errorText="Error loading data."
            height={300}
            loadingText="Loading chart"
            recoveryText="Retry"
            xScaleType="categorical"
            xTitle="Task Name"
            yTitle="Completions"
          />

          <Button
            onClick={() => {
              setRefresh(!refresh);
              setReminders([]);
            }}
          >
            Refresh
          </Button>
          <ExpandableSection headerText="Reminder Notes">
            {reminderNotes?.length
              ? reminderNotes
              : "No notes for this time period"}
          </ExpandableSection>
          {(scale === "WEEK" || scale === "MONTH") && (
            <ExpandableSection headerText="History">
              <Tabs
                tabs={reminders
                  .filter((x) => x.length)
                  .map((reminder) => ({
                    label: reminder[0].details.name,
                    id: reminder[0].reminder_id,
                    content: (
                      <MixedLineBarChart
                        series={[
                          {
                            title: "Completion Rate",
                            type: "bar",
                            data: reminder
                              ? groupReminderByDay(reminder).map((rem) => ({
                                  x: rem.due,
                                  y: rem.reminders.filter((r) => r.completed)
                                    .length,
                                }))
                              : [],
                          },
                          {
                            title: "Target Completions",
                            type: "line",
                            data: reminder
                              ? groupReminderByDay(reminder).map((rem) => ({
                                  x: rem.due,
                                  y: rem.reminders.length,
                                }))
                              : [],
                          },
                        ]}
                        i18nStrings={{
                          xTickFormatter: function o(e) {
                            return new Date(parseInt(e)).toDateString();
                          },
                        }}
                        hideFilter
                        ariaLabel="Chart for displaying rates of task completion by task"
                        errorText="Error loading data."
                        height={300}
                        loadingText="Loading chart"
                        recoveryText="Retry"
                        xScaleType="categorical"
                        xTitle="Task Name"
                        yTitle="Completions"
                      />
                    ),
                  }))}
              />
            </ExpandableSection>
          )}
        </SpaceBetween>
      ) : (
        <Spinner />
      )}
    </ExpandableSection>
  );
};
