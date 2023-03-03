from createTools import create_task, create_supporter, create_child, link_child_to_supporter

supporter = "4948d717-8277-4683-b2eb-cf3de82fcfef"

# If you already have a user you'd just like to reuse from cognito. Paste their sub here and skip the create supporter step.
# supporter = "495fd2d3-b82e-4f86-bb6e-145ea46f58d4"

task1 = create_task({
    "name": "Go to bathroom",
    "description": "Used to prompt going to the bathroom",
    "startTime": {
        "h": 7,
        "m": 30
    },
    "endTime": {
        "h": 20,
        "m": 30
    },
    "frequency": 9,
    "steps": [
        "Go to the bathroom",
        "Pull down pants",
        "Pull up pants",
        "Use toilet",
        "Wash hands",
        "Wipe if needed"
    ]})

task2 = create_task({
    "name": "Brush teeth",
    "description": "A task for brushing teeth",
    "startTime": {
        "h": 7,
        "m": 30
    },
    "endTime": {
        "h": 19,
        "m": 30
    },
    "frequency": 2,
    "steps": [
        "Brush teeth for 3 minutes",
        "Get toothbrush",
        "Put Toothbrush away",
        "Put toothpaste on",
        "Wash Toothbrush",
        "Wipe face"
    ]})

task3 = create_task({
    "name": "Drink water",
    "description": "A task for getting a drink of water",
    "startTime": {
        "h": 7,
        "m": 30
    },
    "endTime": {
        "h": 19,
        "m": 30
    },
    "frequency": 6,
    "steps": [
        "Drink some water",
        "Fill cup",
        "Get cup if you don't have one",
        "Go to Kitchen sink",
        "Take cup if you have one"
    ]})

# Note this child won't have tasks so they will need to be manually added in the dashboard
child = create_child({
    'first_name': 'Max',
    'last_name': "Potter",
    'birthday': "1999-05-09",
    'timezone': "Australia/Melbourne",
    "tasks": [task1, task2]
})

link_child_to_supporter(supporter, child)

print('Ran successfully')