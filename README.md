# Review List
Generate a report of your online activity over the last week

## Supported services

  * Twitter (liked tweets)
  * Google Photos
  * YouTube (liked videos)
  * Podcasts/blogs (RSS feed entries)
  * Kindle (exported highlights)
  
## How to

### Set up a personal copy

  1. In [Google Drive](https://drive.google.com) create a new Google Apps Script file (under "More") and paste in the contents of `Code.gs`.
  1. Update the RSS feeds in the `getPodcasts` method.
  1. Authorize Twitter
      1. Set up a [Twitter API client](https://developer.twitter.com/en/docs/basics/getting-started) and set the key and secret in the `getTwitterService` method.
      1. Open the web app to authorize Twitter: **Publish > Deploy as web app...** and click "Test web app for your latest code."

### Send a weekly email

  1. Set up a personal copy first (see above)
  1. Go to **Edit > Current project's triggers**.
  1. **Add trigger**.
  1. Choose **sendMail** as the function and other settings as desired.
  
### Export Kindle highlights

  1. See https://the-digital-reader.com/2019/03/13/how-to-download-your-kindle-notes-and-highlights-and-export-them/
  1. Send the notes to your Gmail account and __keep them in the inbox__ until the report runs.
  
## Known issues (pull requests welcome!)

  * Google Photos won't display after a short time (a limitation of Google Photos API)
  * Improve display of Tweets (embed images and videos, copy entire threads)
  * Kindle highlights must be in the inbox
