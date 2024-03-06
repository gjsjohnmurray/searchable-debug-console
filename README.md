# Searchable Debug Console

This extension replicates debug console output into a read-only terminal in a dedicated group in the editor area, where it can be searched using Ctrl/Cmd + F.

When output specifies an associated source reference the line number prefix allows that reference to be opened.

If debugging in a workspace results in multiple sessions and you want to suppress creation of the replica for any of these sessions, add the following to the session's debug configuration:
```json
"searchable-debug-console.disabled": true,
```

## About George James Software

George James Software has been providing innovative software solutions for over 35 years. We focus on activities that can help our customers with the support and maintenance of their systems and applications.

The ability for environments to be tailored with extensions makes VS Code a powerful editor for developers. There is an abundance of tools and extensions to discover that will increase productivity and the quality of your code. 

Our team of software engineers are highly experienced in developing tools and extensions for VS Code. We have authored many including source control and debugging, as well as contributed regularly to VS Code itself.

To find out more, go to our website - [georgejames.com](https://georgejames.com) 
