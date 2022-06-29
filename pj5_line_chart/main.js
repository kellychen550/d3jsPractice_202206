//此份資料遇到NA就設定為undefined,否則就維持原本的字串(缺失值的處理)
//參考java語法的三元運算?:
//用三個等號===是為了避免在判斷資料時,JS自動偷做型別轉換(兩個等號==)
//JS比較會因型別不同而有所差異(例如陣列、物件或 class，他們比較的方式是兩個變數是否指向同一個 reference。)
const parseNA = string => (string === 'NA' ? undefined : string);
//d3語法timeParse(),input日期,輸出function()帶入string,output是JS的日期時間格式
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

//從F12貼過來當return參考,每個欄位都是"包起,表示為字串
// budget: "42150098"
// genre: "Animation"
// genres: "[{\"id\": 16, \"name\": \"Animation\"}, {\"id\": 35, \"name\": \"Comedy\"}, {\"id\": 10751, \"name\": \"Family\"}]"
// homepage: "http://toystory.disney.com/toy-story"
// id: "862"
// imdb_id: "tt0114709"
// original_language: "en"
// overview: "Led by Woody, Andy's toys live happily in his room until Andy's birthday brings Buzz Lightyear onto the scene. Afraid of losing his place in Andy's heart, Woody plots against Buzz. But when circumstances separate Buzz and Woody from their owner, the duo eventually learns to put aside their differences."
// popularity: "21.946943"
// poster_path: "/rhIRbceoE9lR4veEXuwCC2wARtG.jpg"
// production_countries: "[{\"iso_3166_1\": \"US\", \"name\": \"United States of America\"}]"
// release_date: "1995-10-30"
// revenue: "524844632"
// runtime: "81"
// status: "Released" //查看下面function,此欄位因不需要而刪去不寫不回傳
// tagline: "NA"
// title: "Toy Story"
// video: "FALSE"
// vote_average: "7.7"
// vote_count: "5415"


//將d.對應到的一筆電影資料整理成想要的type,字串轉換成數字在d前面寫+,要維持字串的用parseNA
//整理完掛入csv,可在F12觀察是否type調整成功(講義P16投影片上)
//關於map語法 https://www.oxxostudio.tw/articles/201412/svg-d3-06-data-nest.html
function type(d) {
    const date = parseDate(d.release_date);
    return {
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d => d.name),//JSON.parse將字串轉換成物件(JSON格式),用map取出需要的欄位
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),//轉換成物件
        release_date: date, //本function開頭已經定義date
        release_year: date.getFullYear(),//回查上面原始資料發現,此欄位是自己需要而增加的
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count,
    }
}

//Data selection,符合條件才回傳資料
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

//https://github.com/d3/d3-format/blob/v3.1.0/README.md#locale_format
//https://github.com/d3/d3-time-format/blob/v4.1.0/README.md#locale_format
function formatTicks(d) {
    return d3.format('~s')(d)
        .replace('M', 'mil')
        .replace('G', 'bil')
        .replace('T', 'tri')
}

//rollup 其實是將 value 內的所有東西,根據我們所下的條件，彙總成一個 value，而不是像 sum 一樣，可以把內容的所有數字相加起來得到一個總和(可參考前面map講解網頁)
//d3方法rollup(data,v長度,d名字)有group/summary的感覺,分群做合併
//d3.rollup依照自己邏輯創造資料dataMap,再套進Array每筆想要的格式
function prepareBarChartData(data) {
    console.log(data);
    const dataMap = d3.rollup(
        data,
        v => d3.sum(v, leaf => leaf.revenue), //將revenue加總
        d => d.genre //依電影分類groupby
    );
    //debugger;
    const dataArray = Array.from(dataMap, d => ({ genre: d[0], revenue: d[1] }));
    return dataArray;
}

function prepareScatterData(data) {
    return data.sort((a, b) => b.budget - a.budget).filter((d, i) => i < 100);
}

function prepareLineChartData(data) {
    //取得發行年份
    const groupByYear = d => d.release_year;
    //只取出revenue加總
    const sumOfRevenue = values => d3.sum(values, d => d.revenue);
    //依年份加總revenue(資料,分群後要做的事情-加總收益,依照年份來分群)
    const sumOfRevenueByYear = d3.rollup(data, sumOfRevenue, groupByYear);
    //debugger;
    //只取出budget加總
    const sumOfBudget = values => d3.sum(values, d => d.budget);
    //依年份加總budget
    const sumOfBudgetByYear = d3.rollup(data, sumOfBudget, groupByYear);
    //debugger;
    //放進array並0按照年份遞增排序
    const revenueArray = Array.from(sumOfRevenueByYear).sort((a, b) => a[0] - b[0]);
    const budgetArray = Array.from(sumOfBudgetByYear).sort((a, b) => a[0] - b[0]);
    //debugger;
    //用年份字串來產生日期時間格式object的資料，作為後續繪圖的X軸
    const parseYear = d3.timeParse('%Y');//2009
    const dates = revenueArray.map(d => parseYear(d[0]));//此處用budgetArray.map也可以找到年份
    //debugger;
    //找出最大值(把各年份的revenue與各年份的budget都先放在一起)
    const revenueAndBudgetArray = revenueArray.map(d => d[1]).concat(budgetArray.map(d => d[1]));
    const yMax = d3.max(revenueAndBudgetArray);
    //最終資料回傳
    const lineData = {
        series:[
            {
                name:'Revenue',
                color:'dodgerblue',
                values:revenueArray.map(d =>({date:parseYear(d[0]),value:d[1]}))
            },
            {
                name:'Budget',
                color:'darkorange',
                values:budgetArray.map(d =>({date:parseYear(d[0]),value:d[1]}))
            }
        ],
        dates:dates,
        yMax:yMax
    }
    return lineData;
}


function addLabel(axis, label, x, y) {
    /* axis 是呼叫者- 哪一個軸*/
    axis.selectAll('.tick:last-of-type text')
        .clone()
        .text(label)
        .attr('x', x).attr('y', y)
        .style('text-anchor', 'start')
        .style('font-weight', 'bold')
        .style('fill', '#555');
}


function setupCanvas(lineChartData) {
    const svg_width = 500;//散佈圖多為正方形
    const svg_height = 500;
    const chart_margin = { top: 80, right: 60, bottom: 40, left: 80 };
    //總長度扣掉預留的margin長度
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);
    //
    const this_svg = d3.select('.line-chart-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height)
        .append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);
    //scale
    //X軸-時間,xExtent抓出最小時間(2000)與最大時間(2009)
    const xExtent = d3.extent(lineChartData.dates);
    const xScale = d3.scaleTime().domain(xExtent).range([0, chart_width]);
    //垂直空間分配-平均分布給各種類
    
    const yScale = d3.scaleLinear().domain([0,lineChartData.yMax]).range([chart_height, 0]);
    //最小的放最下方,與座標相反

    const lineGen = d3.line().x(d=>xScale(d.date)).y(d=>yScale(d.value));

    const chartGroup = this_svg.append('g').attr('class','line-chart');
    
    chartGroup.selectAll('.line-series').data(lineChartData.series).enter()//出現
        .append('path').attr('class',d=>`line-series ${d.name.toLowerCase()}`)
        .attr('d', d => lineGen(d.values))
        .style('fill', 'none')
        .style('stroke', d=>d.color);

    //Draw header
    const header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`).append('text');
    header.append('tspan').text('Budget and Revenue over time in $US');
    header.append('tspan').text('Films w/ budget and revenue figures, 2000-2009').attr('x', 0).attr('y', 20)
        .style('font-size', '0.8em').style('fill', '#555');

    //ticks 決定約略有幾個刻度(依數值狀況)
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    this_svg.append('g').attr('class', 'x axis')
        .attr('transform', `translate(0,${chart_height})`)
        .call(xAxis);
    //拉開字與軸的距離
    // xAxisDraw.selectAll('text').attr('dy', '2em');

    //設定Y軸
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height).tickSizeOuter(0);
    this_svg.append('g').attr('class', 'y axis').call(yAxis);
    //拉開字與軸的距離
    // yAxisDraw.selectAll('text').attr('dx', '-2em');//往左邊拉點距離

    //Draw Series Label
    chartGroup.append('g').attr('class','series-labels')
    .selectAll('.series-label').data(lineChartData.series).enter()
    .append('text')
    .attr('x',d=>xScale(d.values[d.values.length-1].date)+5)
    .attr('y',d=>yScale(d.values[d.values.length-1].value))
    .text(d=>d.name)
    .style('dominant-baseline','central')
    .style('font-size','0.7em').style('font-weight','bold')
    .style('fill',d=>d.color);



}

//Main載入資料,d3用descending是指大排到小
function ready(movies) {
    const moviesClean = filterData(movies);
    const lineChartData = prepareLineChartData(moviesClean);
    console.log(lineChartData);
    setupCanvas(lineChartData);

}

//將前面type(d)掛入,用ready載入
d3.csv('data/movies.csv', type).then(
    res => {
        ready(res);
        //console.log(res);
    }
);