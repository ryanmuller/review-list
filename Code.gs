function getLikedVideos() {
  var channelsResponse = YouTube.Channels.list('contentDetails', {mine: 'true'});
  var likesId = channelsResponse.items[0].contentDetails.relatedPlaylists.likes;
  var itemsResponse = YouTube.PlaylistItems.list('snippet', {playlistId: likesId});
  var out = '<ul>';
  for (var i = 0; i < itemsResponse.items.length; i++) {
    var snippet = itemsResponse.items[i].snippet;
    out += Utilities.formatString('<li><a href="http://www.youtube.com/watch?v=%s">%s</a>',
                                  snippet.resourceId.videoId,
                                  snippet.title);
  }
  out += '</ul>';
  return out;
}

function getTwitterService() {
  return OAuth1.createService('twitter')
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
      // TODO: Set consumer key and secret from a Twitter API project.
      .setConsumerKey()
      .setConsumerSecret()
      .setCallbackFunction('authCallback')
      .setPropertyStore(PropertiesService.getUserProperties());
}


function authCallback(request) {
  var twitterService = getTwitterService();
  twitterService.handleCallback(request);
}

function getTweets() {
  // TODO: embed images, YT as in https://github.com/houshuang/hypothesis-to-bullet/blob/master/twitter-to-bullet.mjs
  // TODO: expand threads
  var twitterService = getTwitterService();
  // https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/get-favorites-list
  var response = JSON.parse(twitterService.fetch('https://api.twitter.com/1.1/favorites/list.json?tweet_mode=extended'));
  var out = '<ul>';
  for (var i = 0; i < response.length; i++) {
    var tweet = response[i];
    var user = tweet.user.screen_name;
    var url = Utilities.formatString('https://twitter.com/%s/status/%s', user, tweet.id_str);
    var tweet_link = Utilities.formatString('<a href="%s">tweet</a>', url);
    out += Utilities.formatString('<li>%s %s: %s', tweet_link, user, tweet.full_text);
  }
  out += '</ul>';
  return out;
}

function showScreenshot(mediaItemId) {
  var token = ScriptApp.getOAuthToken();
  var response = JSON.parse(UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/mediaItems/' + mediaItemId,
                                              {
                                              headers: {
                                              Authorization: 'Bearer ' + token
                                              },
                                              method: 'get',
                                              contentType: 'application/json',
                                              }));
  var baseUrl = Utilities.formatString('%s=w%s-h%s', response.baseUrl, 640, 640);
  return UrlFetchApp.fetch(baseUrl).getBlob();
}

function getScreenshots(sinceTime) {
  var startDate = toApiDate(sinceTime);
  var endDate = toApiDate(new Date(Date.now()));
  var token = ScriptApp.getOAuthToken();
  var response = JSON.parse(UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
    headers: {
      Authorization: 'Bearer ' + token
    },
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      filters: { dateFilter: {ranges: [{startDate: startDate, endDate: endDate}]}}
    })
  }));
  
  var out = '';
  for (var i = 0; i < response.mediaItems.length; i++) {
    var item = response.mediaItems[i];
    if (!item.filename.match(/^Screenshot/)) {
      continue;
    }
    // TODO: baseUrl is only temporary. find another way.
    out += Utilities.formatString('<img src="%s=w%s-h%s">', item.baseUrl, 640, 640);
  }
  return out;
}

function toApiDate(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

function getPodcasts(publishedAfter) {
  var podcastFeedUrls = [
    // TODO: Add podcast RSS feed URLs.
  ];  
  
  var out = '<ul>';
  var startOfWeek = new Date(Date.now() - 7.25 * 24 * 60 * 60 * 1000);
  for (var i = 0; i < podcastFeedUrls.length; i++) {
    var feed = getFeedItems(podcastFeedUrls[i], startOfWeek);
    for (var j = 0; j < feed.items.length; j++) {
      out += Utilities.formatString('<li>%s - %s %s', feed.title, feed.items[j].title, feed.items[j].link);
    }
  }
  out += '</ul>';
  return out;
}

function getFeedItems(url, publishedAfter) {
  try {
    var feed = UrlFetchApp.fetch(url).getContentText();
    var doc = XmlService.parse(feed);
    return {
      title: doc.getRootElement().getChild('channel').getChild('title').getText(),
      items: getRssFeedItems(doc, publishedAfter)
    };
  } catch (e) {
    console.error("Error fetching %s: %s", url, e);
    return [];
  }
}

function getRssFeedItems(doc, publishedAfter) {
  var items = [];
  var itemEls = doc.getRootElement().getChild('channel').getChildren('item');
  
  for (var i in itemEls) {
    var itemEl = itemEls[i];
    var date = itemEl.getChild('pubDate').getText();
    if (date && Date.parse(date) > publishedAfter) {
      items.push({
        title: itemEl.getChild('title').getText(),
        link: itemEl.getChild('link').getText(),
        date: date
      });
    } else {
      break;
    }
  }
  return items;
}

function getKindleNotebooks(sinceDate) {
  var threads = GmailApp.getInboxThreads();
  var out = '<ul>';
  for (var i = 0; i < threads.length; i++) {
    var message = threads[i].getMessages()[0];
    if (!message.getSubject().match(/^Kindle Notebook export/) || message.getDate() < sinceDate) {
      continue;
    }
    // Output example:
    // - [title]
    //   - [section 1]
    //     - [highlight 1]
    //     - [highlight 2]
    //   - [section 2]
    //     - [highlight 3]
    var attachment = message.getAttachments()[0];
    var html = attachment.getDataAsString();
    var lines = html.split(/\r?\n/);
    var readNext;
    var inSection = false;
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (line.match('</div>')) {
         readNext = null;
      } else if (readNext == 'title') {
        out += line + '\n<ul>';
      } else if (readNext == 'section') {
        out += line + '\n<ul>';
      } else if (readNext == 'note') {
        out += line; 
      } else if (line.match('<div class="bookTitle">')) {
        readNext = 'title';
        out += '\n<li>';
      } else if (line.match('<div class="sectionHeading">')) {
        if (inSection) {
          out += '</ul>'; // end previous section
        }
        readNext = 'section';
        out += '\n<li>';
        inSection = true;
      } else if (line.match('<div class="noteText">')) {
        readNext = 'note';
        out += '\n<li>';
      }
    }
    if (inSection) {
      out += '</ul>'; // end last section
    }
    out += '</ul>' // end book
  }
  return out;
}

function generateHtml() {
  var startOfWeek = new Date(Date.now() - 7.25 * 24 * 60 * 60 * 1000);
  var body = '';
  body += '<h2>Tweets</h2>';
  body += getTweets();
  body += '<h2>Videos</h2>';
  body += getLikedVideos();
  body += '<h2>Podcasts</h2>';
  body += getPodcasts(startOfWeek);
  body += '<h2>Screenshots</h2>';
  body += getScreenshots(startOfWeek);
  body += '<h2>Kindle notes</h2>';
  body += getKindleNotebooks(startOfWeek);
  return body;
}


function doGet(e) {
  var twitterService = getTwitterService();
  if (!twitterService.hasAccess()) {
    var authorizationUrl = twitterService.authorize();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Reopen when the authorization is complete.');
    template.authorizationUrl = authorizationUrl;
    return template.evaluate();
  } else {
    return HtmlService.createHtmlOutput(generateHtml());
  }
}

function sendMail() {
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Review list',
    htmlBody: generateHtml()});
}

