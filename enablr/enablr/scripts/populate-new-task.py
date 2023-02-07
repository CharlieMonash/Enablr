from createTools import create_task

task = create_task({
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
