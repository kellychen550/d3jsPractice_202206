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

function cutText(string) {
    return string.length < 35 ? string : string.substring(0, 35) + "...";
}

//rollup 其實是將 value 內的所有東西,根據我們所下的條件，彙總成一個 value，而不是像 sum 一樣，可以把內容的所有數字相加起來得到一個總和(可參考前面map講解網頁)
//d3方法rollup(data,v長度,d名字)有group/summary的感覺,分群做合併
//d3.rollup依照自己邏輯創造資料dataMap,再套進Array每筆想要的格式
function prepareBarChartData(data) {
    console.log(data);
    const dataMap = d3.rollup(
        data,
        v => d3.sum(v, leaf => leaf.revenue),
        d => d.genre
    );
    //debugger;
    const dataArray = Array.from(dataMap, d => ({ genre: d[0], revenue: d[1] }));
    return dataArray;
}

function setupCanvas(barChartData, moviesClean) {
    let metric = 'revenue';
    function click() {
        metric = this.dataset.name;
        const thisData = chooseData(metric, moviesClean);
        update(thisData);

    }
    d3.selectAll('button').on('click', click);

    function update(data) {
        console.log(data);
        //update Scale
        xMax = d3.max(data, d => d[metric]);
        xScale_v3 = d3.scaleLinear([0, xMax], [0, chart_width]);

        yScale = d3.scaleBand().domain(data.map(d => cutText(d.title)))
            .rangeRound([0, chart_height]).paddingInner(0.25);

        //Transition settings
        const defaultDelay = 1000;
        const transitionDelay = d3.transition().duration(defaultDelay);
        //Update axis
        xAxisDraw.transition(transitionDelay).call(xAxis.scale(xScale_v3));
        yAxisDraw.transition(transitionDelay).call(yAxis.scale(yScale));
        //Update Header
        header.select('tspan').text(`Top 15 ${metric} movies ${metric === 'popularity' ? '' : 'in $US'}`);

        bars.selectAll('.bar').data(data, d => d.title).join(
            enter => {
                enter.append('rect').attr('class', 'bar')
                    .attr('x', 0).attr('y', d => yScale(cutText(d.title)))
                    .attr('height', yScale.bandwidth())
                    .style('fill', 'lightcyan')
                    .transition(transitionDelay)
                    .delay((d, i) => i * 20)
                    .attr('width', d => xScale_v3(d[metric]))
                    .style('fill', 'dodgerblue')
            },
            update => {
                update.transition(transitionDelay)
                    .delay((d, i) => i * 20)
                    .attr('y', d => yScale(cutText(d.title)))
                    .attr('width', d => xScale_v3(d[metric]))
            },
            exit => {
                exit.transition().duration(defaultDelay / 2)
                    .style('fill-opacity', 0).remove()
            }
        
         
            );
            d3.selectAll('.bar')
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseout', mouseout);
        
    }
    const svg_width = 700;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 80, buttom: 40, left: 250 };

    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.buttom);

    const this_svg = d3.select('.bar-chart-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height)
        .append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);
    //scale

    //V1.d3.extent find the max & min in revenue從篩選出的19筆找revenue最小跟最大值
    const xExtent = d3.extent(barChartData, d => d.revenue);
    //debugger;
    //scaleLinear(線性比例尺;一段連續的數值可依一個線性函數來換算出數值),domain(要放的資料),range(實際要放東西的區域,寫可放的空間)
    const xScale_v1 = d3.scaleLinear().domain(xExtent).range([0, chart_width]);
    //V2.0 ~ max
    let xMax = d3.max(barChartData, d => d.revenue);
    const xScale_v2 = d3.scaleLinear().domain([0, xMax]).range([0, chart_width]);
    //V3.Short writing for v2
    //paddingInner拉開bar距離(也間接影響到bar粗細)
    let xScale_v3 = d3.scaleLinear([0, xMax], [0, chart_width]);

    let yScale = d3.scaleBand()
        .domain(barChartData.map(d => cutText(d.title)))
        .rangeRound([0, chart_height]).paddingInner(0.25);

    //Draw bars樣式,出現/更新/消失
    // const bars = this_svg.selectAll('.bar')
    //     .data(barChartData)
    //     .enter()//出現
    //     .append('rect').attr('class', 'bar')
    //     .attr('x', 0).attr('y', d => yScale(d.genre))
    //     .attr('width', d => xScale_v3(d.revenue))
    //     .attr('height', yScale.bandwidth())//高
    //     .style('fill', 'dodgerblue');//顏色dodgerblue
    const bars = this_svg.append('g').attr('class', 'bars');
    //Draw header
    let header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`)
        .append('text');
    header.append('tspan').text('Total 15 XXX movies');
    header.append('tspan').text('Years:2000-2009')
        .attr('x', 0).attr('y', 20)
        .style('font-size', '0.8em').style('fill', '#555');


    let xAxis = d3.axisTop(xScale_v3).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height)
        .tickSizeOuter(0);
    let xAxisDraw = this_svg.append('g').attr('class', 'x axis');
    let yAxis = d3.axisLeft(yScale).tickSize(0);
    let yAxisDraw = this_svg.append('g').attr('class', 'y axis');
    yAxisDraw.selectAll('text').attr('dx', '-0.6em');
    update(barChartData);

    const tip = d3.select('.tooltip');

    function mouseover(e) {
        // debugger;
        const thisBarData = d3.select(this).data()[0];

        const bodyData = [
            ['Budget', formatTicks(thisBarData.budget)],
            ['Revenue',formatTicks(thisBarData.revenue)],
            ['Profit', formatTicks(thisBarData.revenue - thisBarData.budget)],
            ['TMDB Popularity', Math.round(thisBarData.popularity)],
            ['IMDB Rating', thisBarData.vote_average],
            ['Genres', thisBarData.genres.join(', ')]
        ];

        tip.style('left', (e.clientX + 15) + 'px')
            .style('top', e.clientY + 'px')
            .transition()
            .style('opacity', 0.98)
        // .html('Hello')
        tip.select('h3').html(`${thisBarData.title}, ${thisBarData.release_year}`);
        tip.select('h4').html(`${thisBarData.tagline}, ${thisBarData.runtime} min.`);

        d3.select('.tip-body').selectAll('p').data(bodyData)
            .join('p').attr('class', 'tip-info')
            .html(d => `${d[0]} : ${d[1]}`);

    }
    function mousemove(e) {
        tip.style('left', (e.clientX + 15) + 'px')
            .style('top', e.clientY + 'px')
        // .style('opacity', 0.98)
        // .html('Hello')
    }
    function mouseout(e) {
        tip.transition()
        .style('opacity', 0)
    }

    d3.selectAll('.bar')
        .on('mouseover', mouseover)
       .on('mousemove', mousemove)
        .on('mouseout', mouseout);

}

//Main
function ready(movies) {
    const moviesClean = filterData(movies);
    //Get Top 15 revenue movies
    const revenueData = chooseData("revenue", moviesClean);
    // debugger;
    setupCanvas(revenueData, moviesClean);
}

function chooseData(metric, moviesClean) {
    const thisData = moviesClean.sort((a, b) => b[metric] - a[metric]).filter((d, i) => i < 15);
    return thisData;
}


d3.csv('data/movies.csv', type).then(
    res => {
        ready(res);
        // console.log(res);
    }
);