import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class TaskWidget extends StatefulWidget {
  const TaskWidget(
      {super.key, required this.reminder, required this.completeTaskCallback});

  final Map<String, dynamic> reminder;
  final Function completeTaskCallback;

  @override
  State<TaskWidget> createState() => TaskWidgetState();
}

class TaskWidgetState extends State<TaskWidget> {
  String note = '';

  void updateNote(value) {
    setState(() {
      note = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.reminder['note'] != "") {
      note = widget.reminder['note'];
    }
    var details = widget.reminder['details'] as Map<String, dynamic>;
    int due = int.parse(widget.reminder['due'] as String) * 1000;
    var completed = widget.reminder['completed'] as bool;
    var backgroundColor;
    var textColor;
    var status = 'NOT_DONE';

    var time = DateTime.now().millisecondsSinceEpoch;

    if (completed) {
      backgroundColor = Colors.green;
      textColor = Colors.white;
      status = 'COMPLETED';
    } else if (due < time) {
      backgroundColor = Colors.pink;
      textColor = Colors.white;
      status = 'OVERDUE';
    } else if (due > time && due - (time + 1000 * 60 * 5) < (1000 * 60 * 5)) {
      backgroundColor = Colors.orange;
      textColor = Colors.white;
      status = 'DUE_SOON';
    }

    var icon = Icon(
      completed ? Icons.check_box : Icons.check_box_outline_blank,
      // color: textColor,
    );

    var theme = Theme.of(context);

    return ExpansionTile(
      key: ValueKey<String>(status),
      collapsedBackgroundColor: backgroundColor,
      collapsedTextColor: textColor,
      collapsedIconColor: textColor,
      title: Row(children: [
        icon,
        const SizedBox(width: 10),
        Text(
          details['name'] as String,
          style: TextStyle(fontSize: 20.0),
        ),
      ]),
      children: <Widget>[
        Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(children: [
              Text(
                DateFormat('hh:mm a')
                    .format(DateTime.fromMillisecondsSinceEpoch(due)),
                style: TextStyle(fontSize: 20.0),
              ),
              const SizedBox(height: 10),
              Text(
                details['description'] as String,
              ),
              const SizedBox(height: 10),
              TextFormField(
                initialValue: note,
                enabled: widget.reminder['note'] == "",
                onChanged: ((value) => updateNote(value)),
                decoration: InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Enter optional notes',
                ),
              ),
              ElevatedButton(
                onPressed: (() {
                  widget.completeTaskCallback(note, widget.reminder);
                }),
                child: const Text('Complete task'),
              ),
            ])),

        // add more data that you want like this
      ],
    );
  }
}
