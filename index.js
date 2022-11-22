const SoundCloud = require("soundcloud-scraper");
const client = new SoundCloud.Client();
const puppeteer = require("puppeteer");

function soundCloudOdiScrape(scrapeNumber) {
  const extractItems = () => {
    let items = [];
    document
      .querySelectorAll("div.soundTitle__usernameTitleContainer > a")
      .forEach((link) => {
        items.push(link.href);
      });
    return items;
  };

  async function scrapeItems(page, extractItems, itemCount, scrollDelay = 800) {
    let items = [];
    try {
      let previousHeight;
      while (items.length < itemCount) {
        items = await page.evaluate(extractItems);
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForFunction(
          `document.body.scrollHeight > ${previousHeight}`
        );
        await page.waitForTimeout(scrollDelay);
      }
    } catch (e) {}
    return items;
  }

  async function scrollAndReturn() {
    // Set up Chromium browser and page.
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 926 });

    // Navigate to the example page.
    await page.goto("https://soundcloud.com/theodi");

    // Auto-scroll and extract desired items from the page. Currently set to extract ten items.
    const items = await scrapeItems(page, extractItems, scrapeNumber);

    // console.log(await items)
    await browser.close();
    // if item contains the word sets then remove it from the array
    let filteredItems = items.filter((item) => !item.includes("sets"));
    return filteredItems;
  }

  const findType = (details) => {
    if (details.includes("Summit")) {
      return "ODI Summit";
    } else if (details.includes("Futures")) {
      return "ODI Futures";
    } else if (details.includes("Canalside Chats")) {
      return "ODI Canalside Chat";
    } else if (details.includes("Fridays")) {
      return "ODI Fridays";
    } else if (details.includes("Inside Business")) {
      return "ODI Inside Business";
    } else {
      return "N/A";
    }
  };

  // loop through links and call soundcloud api
  const getSongArrInfo = async () => {
    let songArr = await scrollAndReturn();
    try {
      let songArrInfo = [];
      for await (let song of songArr) {
        let songInfo = await client.getSongInfo(song);
        songArrInfo.push(songInfo);
      }
      // clean song info. create object with title, descirption, thumbnail, url, thumbnail, duration, playcount, likes, comments title, artist, url
      let cleanSongArrInfo = songArrInfo.map((song) => {
        return {
          Title: song.title,
          "Event / Series": findType(song.title),
          Description: song.description,
          Thumbnail: song.thumbnail,
          URL: song.url,
          Duration: song.duration,
          "Play Count": song.playCount,
          Likes: song.likes,
          Date: song.publishedAt.split("T")[0],
          Type: "Podcast",
        };
      });
      return cleanSongArrInfo;
    } catch (e) {
      console.log(e);
    }
  };

  return getSongArrInfo().then((data) => {
    return data;
  });
}


module.exports = {
  soundCloudOdiScrape
};
