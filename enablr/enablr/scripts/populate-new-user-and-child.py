from createTools import create_supporter, create_child, link_child_to_supporter

supporter = create_supporter({
    'email': '<your email here>',
    'first_name': 'Ron',
    'last_name': "Swanston"
})

# If you already have a user you'd just like to reuse from cognito. Paste their sub here and skip the create supporter step.
# supporter = "495fd2d3-b82e-4f86-bb6e-145ea46f58d4"

# Note this child won't have tasks so they will need to be manually added in the dashboard
child = create_child({
    'first_name': 'Tod',
    'last_name': "Havorford",
    'birthday': "2002-01-02",
    'timezone': "Australia/Melbourne"
})

link_child_to_supporter(supporter, child)

print('Ran successfully')