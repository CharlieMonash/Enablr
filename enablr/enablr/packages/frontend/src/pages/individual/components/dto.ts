// Where types are defined.
export interface IndividualDto {
  tasks: TaskDto[];
  details: DetailsDto;
  individual_id: string;
}

export interface DetailsDto {
  firstName: string;
  lastName: string;
  birthday: string;
  tz: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface TaskDetailsDTO {
  name: string;
  description: string;
  frequency: number;
  startTime: TaskTime;
  endTime: TaskTime;
}

export interface TaskDto {
  task_id: string;
  details: TaskDetailsDTO;
}

export interface TaskDtoDetails {
  name: string;
  description: string;
  frequency: number;
  startTime: TaskTime;
  endTime: TaskTime;
}

interface TaskTime {
  h: number;
  m: number;
}

export interface ReminderDTO {
  reminder_id: string;
  due: number;
  note: string;
  completed: boolean;
  details: TaskDetailsDTO;
}
