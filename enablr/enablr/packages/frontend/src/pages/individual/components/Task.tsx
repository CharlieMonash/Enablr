import {
  Button,
  ExpandableSection,
  Form,
  FormField,
  SpaceBetween,
  Container,
} from "@cloudscape-design/components";
import { API } from "aws-amplify";

import { useCallback, useEffect, useState } from "react";
import { ReminderDTO, TaskDto } from "./dto";
import { Reminder } from "./Reminder";
import { REST_API_NAME } from "../../../utils/consts";

/*
The actual component for each individual task where it can be edited and viewed.
*/
export const Task: React.FC<{
  task: TaskDto;
  individual_id: string;
  saveCallback: (task: TaskDto) => Promise<any>;
  removeCallback?: (task_id: string) => Promise<any>;
  edit?: boolean;
  cancel?: () => void;
}> = ({ task, individual_id, saveCallback, removeCallback, edit, cancel }) => {
  const [editMode, setEditMode] = useState<boolean>(!!edit);
  const [reminders, setReminders] = useState<ReminderDTO[]>([]);

  const [snapshotTask, setSnapshotTask] = useState(task.details);
  const [name, setName] = useState(task.details.name);
  const [description, setDescription] = useState(task.details.description);
  const [frequency, setFrequency] = useState(task.details.frequency);
  const [startTime, setStartTime] = useState(task.details.startTime);
  const [endTime, setEndTime] = useState(task.details.endTime);

  const saveChanges = useCallback(async () => {
    // Callback
    saveCallback({
      task_id: task.task_id,
      details: {
        name,
        description,
        frequency,
        startTime,
        endTime,
      },
    })
      .then(() => {
        setSnapshotTask({
          name,
          description,
          frequency,
          startTime,
          endTime,
        });
        setEditMode(false);
      })
      .catch((e) => console.error(e));
  }, [name, description, frequency, startTime, endTime]);

  const cancelChanges = useCallback(async () => {
    setEditMode(false);
    setName(snapshotTask.name);
    setDescription(snapshotTask.description);
    setFrequency(snapshotTask.frequency);
    setStartTime(snapshotTask.startTime);
    setEndTime(snapshotTask.endTime);
  }, [snapshotTask]);

  const refreshReminders = () =>
    API.get(
      REST_API_NAME,
      `individual/reminders/${individual_id}/${individual_id}-${task.task_id}`,
      {}
    )
      .then((result) =>
        setReminders(
          result.reminders.map((r: any) => ({
            ...r,
            due: parseInt(r.due) * 1000,
          }))
        )
      )
      .catch((e) => {
        console.error(e);
      });

  useEffect(() => {
    // Put on a delay as it may take a moment to refresh the reminders
    const timeout = setTimeout(refreshReminders, 3000);
    return () => clearTimeout(timeout);
  }, [snapshotTask]);

  return (
    <Container>
      {!editMode ? (
        <div>
          <b>{`${name}`}</b>
          <p>{`Task Description: ${description}`}</p>
          <p>{`Task Frequency: ${frequency}`}</p>
          <p>{`StartTime: ${startTime.h}:${
            startTime.m >= 10 ? startTime.m : "0" + startTime.m
          }`}</p>
          <p>{`StartTime: ${endTime.h}:${
            endTime.m >= 10 ? endTime.m : "0" + endTime.m
          }`}</p>
          <SpaceBetween size="s" direction="horizontal">
            <Button onClick={() => setEditMode(true)}>Edit</Button>
            {removeCallback && (
              <Button onClick={() => removeCallback(task.task_id)}>
                Remove
              </Button>
            )}
          </SpaceBetween>
        </div>
      ) : (
        <Form>
          {/* <pre key={task.task_id}>{JSON.stringify(task, null, 2)}</pre> */}
          <SpaceBetween size="s" direction="horizontal">
            <FormField label="Name" description="The name of the task">
              <b>{`${name}`}</b>
            </FormField>
            <FormField
              label="Description"
              description="The description of the task"
            >
              <input
                type="string"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                id={`${task.task_id}-description`}
              />
            </FormField>
            <FormField
              label="Frequency"
              description="How many times the task will occur per day"
            >
              <input
                type="number"
                value={frequency}
                id={`${task.task_id}-frequency`}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
              />
            </FormField>
          </SpaceBetween>
          <SpaceBetween size="s" direction="horizontal">
            <FormField
              label="Start time"
              description="When the first reminder will begin"
            >
              <input
                type="number"
                value={startTime.h}
                id={`${task.task_id}-startTime-h`}
                onChange={(e) =>
                  setStartTime({
                    ...startTime,
                    h: parseInt(e.target.value),
                  })
                }
                max="23"
                min="0"
              />
              :
              <input
                type="number"
                value={startTime.m}
                id={`${task.task_id}-startTime-m`}
                onChange={(e) =>
                  setStartTime({
                    ...startTime,
                    m: parseInt(e.target.value),
                  })
                }
                min="0"
                max="59"
              />
            </FormField>

            <FormField
              label="End time"
              description="When the last reminder will occur"
            >
              <input
                type="number"
                value={endTime.h}
                id={`${task.task_id}-endTime-h`}
                onChange={(e) =>
                  setEndTime({
                    ...endTime,
                    h: parseInt(e.target.value),
                  })
                }
                max="24"
                min="1"
              />
              :
              <input
                type="number"
                value={endTime.m}
                id={`${task.task_id}-endTime-m`}
                onChange={(e) =>
                  setEndTime({
                    ...endTime,
                    m: parseInt(e.target.value),
                  })
                }
                min="0"
                max="59"
              />
            </FormField>

            <SpaceBetween size="s" direction="horizontal">
              <Button onClick={saveChanges}>Save</Button>
              <Button onClick={() => (!!cancel ? cancel() : cancelChanges())}>
                Cancel
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Form>
      )}
      {!!reminders.length && (
        <ExpandableSection
          headingTagOverride="h4"
          headerText="Upcoming Reminders"
          defaultExpanded={false}
        >
          <SpaceBetween size="s">
            <Reminder
              reminders={reminders.filter(
                // Get only future reminders
                (r) => r.due > Date.now()
              )}
            />
            <Button onClick={refreshReminders}>Refresh reminders</Button>
          </SpaceBetween>
        </ExpandableSection>
      )}
    </Container>
  );
};
