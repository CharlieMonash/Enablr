import { API } from "aws-amplify";
import { useEffect, useState } from "react";
import { TaskDto } from "../pages/individual/components/dto";
import { REST_API_NAME } from "../utils/consts";

// Tasks will be used across all individuals, the hook prevents further calls
export const useTasks = () => {
  const [tasks, setTasks] = useState<TaskDto[]>([]);

  useEffect(() => {
    API.get(REST_API_NAME, "task/tasks", {})
      .then((result) => setTasks(result.tasks))
      .catch((e) => {
        console.error(e);
      });
  }, []);

  return tasks;
};
