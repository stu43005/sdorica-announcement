var locale = "zh_TW";
var annoUrl = "https://www.sdorica.com/" + locale.substr(0, 2) + "/announcement/";
var apiUrl = "https://1x0x0-api-sermo.rayark.net/api/announcement/sdorica-web/news?num=1000&locale=" + locale;
var apiGameUrl = "https://1x0x0-api-sermo.rayark.net/v1/sdorica-game/news?locale=" + locale;

var webhookUrl = "";
var sheetId = "";

var cacheTime = 1800;

function doCheck() {
  if (!sheetId) {
    return;
  }
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var sheetdata = new Sheet(sheet);

  var list = getJson(apiUrl);
  var gamelist = getJson(apiGameUrl);

  var bug_issue = false;
  // 處理官網公告
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var title = (item.title + "").trim();
    var link = annoUrl + "#" + item._id;
    var content = item.content.replace(/( *)\r?\n/g, "\n").replace(/\&nbsp\;/g, " ");
    var md5str = md5(item.content);
    
    var text = content;
    if (text.length >= 2000) {
      text = text.substring(0, 2000) + " ...";
    }
    
    // 異常狀況更新另外處理
    if (item.category == "bug_issue") {
      if (bug_issue) {
        // 僅處理最新一篇異常狀況更新
        continue;
      }
      bug_issue = true;

      var content2 = item.content.replace("\r", "").split("\n").map(function (c) {
        return c.trim();
      });
      var groups = [];
      for (var j = 0; j < content2.length; j++) {
        if (content2[j].indexOf("⦿") == 0) {
          groups.push([]);
        }
        if (groups.length > 0) {
          groups[groups.length - 1].push(content2[j]);
        }
      }
      
      for (var j = 0; j < groups.length; j++) {
        var groupcontent = groups[j].join("\n").trim();
        var md5str2 = md5(groupcontent);

        var sheetitem2 = sheetdata.find(function (d, i) {
          return d[0] == item._id && d[3] == groups[j][0];
        });
        
        if (!sheetitem2 || sheetitem2.data[1] != md5str2) {
          var payload2 = {
            username: "Sdorica 萬象物語 | 官方網站",
            embeds: [{
              "title": "【" + cat2text(item.category) + "】" + title,
              "url": link,
              "color": cat2color(item.category),
              "description": groupcontent,
              "timestamp": item.timestamp
            }]
          };
          if (webhookUrl) {
            makeWebhook(webhookUrl, payload2);
          }
          
          var newdata2 = [item._id, md5str2, new Date(), groups[j][0]];
          Logger.log("newdata: " + JSON.stringify(newdata2));
          if (!sheetitem2) {
            sheetdata.insertNewRow(newdata2);
          }
          else {
            sheetitem2.setValues(newdata2);
          }
        }
      }
      continue;
    }

    // 尋找該官網公告是否存在
    var sheetitem = sheetdata.find(function (d, i) {
      return d[0] == item._id;
    });
    if (!sheetitem) {
      // 尋找是否已經有遊戲公告(依照標題相同、必須是同一天)
      sheetitem = sheetdata.find(function (d) {
        if (d[0] || !d[4]) return false;
        var bitem = gamelist.find(function (bb) {
          return d[4] == bb._id;
        });
        if (!bitem) return false;
        return d[3].trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1") == title.trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1")
            && Math.abs(timestamp2Date(item.timestamp).getTime() - timestamp2Date(bitem.timestamp).getTime()) < 86400000;
      });
    }
    if (!sheetitem) {
      // 尋找是否已經有遊戲公告(模糊搜尋、必須是同一天)
      sheetitem = sheetdata.find(function (d) {
        if (d[0] || !d[4]) return false;
        var bitem = gamelist.find(function (bb) {
          return d[4] == bb._id;
        });
        if (!bitem) return false;
        return d[3].trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1").replace(/(【|\[)([^】\]]*)(】|\])/, "") == title.trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1").replace(/(【|\[)([^】\]]*)(】|\])/, "")
            && Math.abs(timestamp2Date(item.timestamp).getTime() - timestamp2Date(bitem.timestamp).getTime()) < 86400000;
      });
    }
    
    // 新公告、公告有編輯
    if (!sheetitem || sheetitem.data[1] != md5str) {
      var payload = {
        username: "Sdorica 萬象物語 | 官方網站",
        embeds: [{
          "title": "【" + cat2text(item.category) + "】" + title,
          "url": link,
          "color": cat2color(item.category),
          "description": text,
          "timestamp": item.timestamp
        }]
      };
      if (item.tldr) {
        payload["embeds"][0]["image"] = {
          "url": item.tldr
        };
      }
//      if (sheetitem.length > 0) {
//        payload["embeds"][0]["footer"] = {
//          "text": "Edited"
//        };
//      }
      if (webhookUrl) {
        makeWebhook(webhookUrl, payload);
      }

      if (!sheetitem) {
        var newdata = [item._id, md5str, new Date(), title];
        sheetdata.insertNewRow(newdata);
      }
      else {
        sheetitem.data[0] = item._id;
        sheetitem.data[1] = md5str;
        sheetitem.data[2] = new Date();
        sheetitem.data[3] = item.title;
        sheetitem.setValues(sheetitem.data);
      }
    }
  }
  
  
  // 處裡遊戲內公告
  for (var i = 0; i < gamelist.length; i++) {
    var item = gamelist[i];
    var title = (item.title + "").trim();
    var content = item.content.replace(/( *)\r?\n/g, "\n").replace(/\&nbsp\;/g, " ").replace(/\<url\=([^\>]*)\>([^\<]*)\<\/url\>/, "[$2]($1)");
    var md5str = md5(item.content);
    
    var text = content;
    if (text.length >= 2000) {
      text = text.substring(0, 2000) + " ...";
    }

    // 尋找該遊戲公告是否已存在
    var sheetitem = sheetdata.find(function (d, i) {
      return d[4] == item._id;
    });
    if (!sheetitem) {
      // 尋找是否已經有官網公告(依照標題相同、必須是同一天)
      sheetitem = sheetdata.find(function (d) {
        if (!d[0] || d[4]) return false;
        var bitem = list.find(function (bb) {
          return d[0] == bb._id;
        });
        if (!bitem) return false;
        return d[3].trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1") == title.trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1")
            && Math.abs(timestamp2Date(item.timestamp).getTime() - timestamp2Date(bitem.timestamp).getTime()) < 86400000;
      });
    }
    if (!sheetitem) {
      // 尋找是否已經有官網公告(模糊搜尋、必須是同一天)
      sheetitem = sheetdata.find(function (d) {
        if (!d[0] || d[4]) return false;
        var bitem = list.find(function (bb) {
          return d[0] == bb._id;
        });
        if (!bitem) return false;
        return d[3].trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1").replace(/(【|\[)([^】\]]*)(】|\])/, "") == title.trim().replace(/\s/g, "").replace(/(\.|\/)0/g, "$1").replace(/(【|\[)([^】\]]*)(】|\])/, "")
            && Math.abs(timestamp2Date(item.timestamp).getTime() - timestamp2Date(bitem.timestamp).getTime()) < 86400000;
      });
    }

    if (!sheetitem) {
      var payload = {
        username: "Sdorica 萬象物語 | 遊戲公告",
        embeds: [{
          "title": "【" + cat2text(item.category) + "】" + title,
          "color": cat2color(item.category),
          "description": text,
          "timestamp": timestamp2Date(item.timestamp).toISOString()
        }]
      };
      if (webhookUrl) {
        makeWebhook(webhookUrl, payload);
      }
      
      var newdata = ["", "", new Date(), title, item._id, md5str, title];
      sheetdata.insertNewRow(newdata);
    }
    else {
      // check update sheets
      if (!sheetitem.data[4]) {
        sheetitem.data[4] = item._id;
        sheetitem.data[5] = md5str
        sheetitem.data[6] = title;
        sheetitem.setValues(sheetitem.data);
      }
    }
  }
  
  SpreadsheetApp.flush();
}

function timestamp2Date(timestamp) {
  if (typeof timestamp == "number") {
    return new Date(timestamp * 1000);
  }
  return new Date(timestamp);
}

function cat2text(cat) {
  switch(cat) {
    case "event":
      return "活動";
    case "update":
      return "更新";
    case "news":
    case "server":
    default:
      return "公告";
    case "bug_issue":
      return "異常狀況更新";
  }
}

function cat2color(cat) {
  switch(cat) {
    case "event":
      return "15253589";
    case "update":
      return "6020015";
    case "news":
    case "server":
    default:
      return "16752753";
    case "bug_issue":
      return "14930110";
  }
}

function getJson(url) {
  var list, htmlText;
  var id = "json_" + Utilities.base64Encode(url);
  
  var cache = CacheService.getScriptCache();
  htmlText = cache.get(id);
  
  if (htmlText != null) {
    list = JSON.parse(htmlText);
    return list;
  }

  htmlText = UrlFetchApp.fetch(url).getContentText();
  list = JSON.parse(htmlText);

  try {
    cache.put(id, htmlText, cacheTime);
  }
  catch (e) { }
  return list;
}


function makeWebhook(url, data) {
  var options = {
    'method': 'post',
    "contentType" : "application/json",
    'payload': JSON.stringify(data)
  };

  var response = UrlFetchApp.fetch(url, options);
  return response;
}

function md5(str) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str).reduce(function(str,chr){
    chr = (chr < 0 ? chr + 256 : chr).toString(16);
    return str + (chr.length==1?'0':'') + chr;
  },'');
}

function Sheet(sheet) {
  this.sheet = sheet;

  if (sheet.getLastRow() > 1 && sheet.getLastColumn() > 0) {
    var dataRange = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn());
    this.data = dataRange.getValues();
  } else {
    sheet.getRange(1, 1, 1, 7).setValues([
      ["id", "md5", "time", "title", "gameid", "gamemd5", "gametitle"]
    ]);
    this.data = [];
  }
}

Sheet.prototype.find = function (predicate) {
  for (var i = 0; i < this.data.length; i++) {
    if (predicate.call(this, this.data[i], i)) {
      return new SheetRow(this.sheet, this.data[i], i);
    }
  }
};

Sheet.prototype.insertNewRow = function (values) {
  var lastRow = Math.max(this.sheet.getLastRow(), 1);
  this.sheet.insertRowAfter(lastRow);
  this.sheet.getRange(lastRow + 1, 1, 1, values.length).setValues([values]);
  this.data.push(values);
};

function SheetRow(sheet, data, index) {
  this.sheet = sheet;
  this.data = data;
  this.index = index;
}

SheetRow.prototype.setValues = function (values) {
  this.sheet.getRange(this.index + 2, 1, 1, values.length).setValues([values]);
  if (this.data != values) {
    for (var i = 0; i < Math.max(this.data.langth, values.length); i++) {
      if (i < values.length) {
        this.data[i] = values[i];
      }
      else {
        this.data.splice(i, this.data.length - i);
        break;
      }
    }
  }
};
