import { Button, Select, SpaceBetween } from "@cloudscape-design/components";
import { OptionDefinition } from "@cloudscape-design/components/internal/components/option/interfaces";
import { API } from "aws-amplify";
import { useState, useCallback, useEffect } from "react";
import { TaskDto } from "./dto";
import { Task } from "./Task";
import { useTasks } from "../../../hooks/tasks";
import { REST_API_NAME } from "../../../utils/consts";

/*
The component where tasks can be viewed as well as edited by Primary users.
*/
export const IndividualTasks: React.FC<{
  individual: any;
}> = ({ individual }) => {
  const [tasks, setTasks] = useState<TaskDto[]>(individual.tasks);
  const [newTaskMode, setNewTaskMode] = useState(false);
  const [dropdownTask, setDropdownTask] = useState<OptionDefinition | null>(
    null
  );

  const staticTasks = useTasks();

  useEffect(() => {
    const uniqueTasks = staticTasks.filter(
      (st) => !tasks.find((t) => t.task_id === st.task_id)
    );

    if (uniqueTasks[0]) {
      setDropdownTask({
        value: uniqueTasks[0].task_id,
        label: uniqueTasks[0].details.name,
      });
    }
  }, []);

  const saveChanges = useCallback(
    async (task: TaskDto) => {
      const newTasks = tasks.map((t) =>
        t.task_id === task.task_id ? task : t
      );

      return postChanges(newTasks);
    },
    [tasks]
  );

  const saveNewTask = useCallback(
    async (task: TaskDto) => {
      setNewTaskMode(false);
      const newTasks = [...tasks, task];

      const uniqueTasks = staticTasks.filter(
        (st) => !newTasks.find((t) => t.task_id === st.task_id)
      );

      if (uniqueTasks[0]) {
        setDropdownTask({
          value: uniqueTasks[0].task_id,
          label: uniqueTasks[0].details.name,
        });
      } else {
        setDropdownTask(null);
      }

      return postChanges(newTasks);
    },
    [tasks]
  );

  const removeTask = useCallback(
    async (task_id: string) => {
      const newTasks = tasks.filter((t) => t.task_id !== task_id);
      setNewTaskMode(false);
      setTasks(newTasks);
      return postChanges(newTasks);
    },
    [tasks]
  );

  const postChanges = (newTasks: TaskDto[]) => {
    return API.post(
      REST_API_NAME,
      `individual/${individual.individual_id}/tasks`,
      {
        body: {
          tasks: newTasks,
        },
      }
    )
      .then((result) => {
        console.log(result);
        setTasks(newTasks);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  return (
    <SpaceBetween size={"l"}>
      <SpaceBetween size={"s"} direction="horizontal">
        {tasks.map((task) => (
          <Task
            key={task.task_id}
            task={task}
            saveCallback={saveChanges}
            individual_id={individual.individual_id}
            removeCallback={removeTask}
          />
        ))}
      </SpaceBetween>
      {newTaskMode ? (
        <div>
          <p>Available Tasks:</p>
          <Select
            selectedOption={dropdownTask}
            options={staticTasks
              .filter((st) => !tasks.find((t) => t.task_id === st.task_id))
              .map((x) => ({
                value: x.task_id,
                label: x.details.name,
              }))}
            onChange={(e) => setDropdownTask(e.detail.selectedOption)}
          />
          {dropdownTask ? (
            staticTasks
              .filter((t) => t.task_id === dropdownTask.value)
              .map((st) => (
                <Task
                  key={st.task_id}
                  task={st}
                  individual_id={individual.individual_id}
                  saveCallback={saveNewTask}
                  cancel={() => setNewTaskMode(false)}
                  edit
                />
              ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
      ) : (
        !!staticTasks.filter(
          (st) => !tasks.find((t) => t.task_id === st.task_id)
        ).length && (
          <Button onClick={() => setNewTaskMode(true)}>New task</Button>
        )
      )}
    </SpaceBetween>
  );
};
