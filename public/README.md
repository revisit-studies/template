# The Public Folder: Experiment Configs, Stimuli and Resources

Files that are in the `public` folder are exposed on the study website. For technical reasons, all static files, including reVISit configurations, have to be in the public folder.

If you want to create a new experiment, you should create a new subfolder in this `public` folder that contains your reVISit config.

Study folder names can include periods (`.`), spaces, and other characters, but reVISit normalizes study URLs by replacing periods, spaces, and slashes with underscores. Use links generated in the app to avoid mismatched manual URLs.

Example projects that explain basic reVISit functionality are:

- [tutorial](tutorial), the starter tutorial study included in this template.
  - [Tutorial guide](https://revisit.dev/docs/tutorial/)
  - [Tutorial config reference](https://revisit.dev/docs/tutorial/config.json/)
  - [Replication tutorial config reference](https://revisit.dev/docs/tutorial/replication-config.json/)

Folders that don't contain an experiment are:

- [libraries](libraries) which contains reusable reVISit study libraries.
- [revisitAssets](revisitAssets) which contains shared reVISit assets.
- [revisitUtilities](revisitUtilities) which contains shared utility files used by the app.
