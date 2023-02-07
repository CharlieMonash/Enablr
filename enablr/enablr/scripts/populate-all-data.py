from createTools import create_task, create_supporter, create_child, link_child_to_supporter

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

supporter1 = create_supporter({
    'email': '<your email here>',
    'first_name': 'Ron',
    'last_name': "Swanston"
})

# If you already have a user you'd just like to reuse from cognito. Paste their sub here and skip the create supporter step.
# supporter = "495fd2d3-b82e-4f86-bb6e-145ea46f58d4"

child1 = create_child({
    'first_name': 'Tod',
    'last_name': "Havorford",
    'birthday': "2002-01-02",
    'timezone': "Australia/Melbourne",
    "tasks": [task1, task2]
})

link_child_to_supporter(supporter1, child1)

child2 = create_child({
    'first_name': 'Amy',
    'last_name': "Leigh",
    'birthday': "2002-07-02",
    'timezone': "Australia/Melbourne",
    "tasks": [task1, task2]
})

link_child_to_supporter(supporter1, child2)

supporter2 = create_supporter({
    'email': '<your other email here>',
    'first_name': 'Bob',
    'last_name': "Burgers"
})

print('Ran successfully')
