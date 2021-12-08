import React from 'react';
import { addWeeks, addDays, addHours, isAfter, formatRFC3339, formatDistanceToNowStrict } from 'date-fns';
import sortByCreatedAt from './utils';
import { preProcessFile } from 'typescript';
import { report } from 'process';

type Event = {
  createdAt: string;
  author: string;
  state: string;
}

const combineReviewsAndComments = (reviews: any, comments: any) => {
  const events: Event[] = [];

  reviews.nodes?.forEach((review: any) => {
    const event: Event = {
      createdAt: review.createdAt,
      author: review.author.login,
      state: review.state,
    }
    events.push(event);
  })

  comments.nodes.forEach((comment: any) => {
    const event: Event = {
      createdAt: comment.createdAt,
      author: comment.author.login,
      state: "ISSUECOMMENTED",
    }
    events.push(event);
  })

  return events.sort(sortByCreatedAt);
}

const getAgeString = (createdAt: Date) => {
  const current = new Date();
  if (isAfter(createdAt, addHours(current, -1))) {
    return 'last-hour';
  } else if (isAfter(createdAt, addHours(current, -2))) {
    return 'last-two-hours';
  } else if (isAfter(createdAt, addDays(current, -1))) {
    return 'last-day';
  } else if (isAfter(createdAt, addWeeks(current, -1))) {
    return 'last-week';
  }
  return 'over-week-old';
}

const getCommitState = (headRefOid: string, timeline: any) => {
  const commit = timeline.nodes.find((commit: any) => commit.oid === headRefOid);
  const [checkmark, circle, cross] = ['\u2714', '\u25cf', '\u2613'];

  if (!commit?.status) {
    return <span className="missing">-</span>;
  } else if (commit.status.state === 'SUCCESS') {
    return <span className="success">{checkmark}</span>;
  } else if (commit.status.state === 'PENDING') {
    return <span className="pending">{circle}</span>;
  }

  return <span className="failed">{cross}</span>;
}

const TimelineEvent = (props: Event) => {
  const [checkmark, bubble, cross] = ['\u2714', '\u{0001F4AC}', '\u2613'];

  if (props.state === 'APPROVED') {
    return <span className="approved">{props.author} {checkmark} </span>;
  } else if (props.state === 'CHANGES_REQUESTED') {
    return <span className="changes-requested">{props.author} {cross} </span>;
  } else if (props.state === 'COMMENTED') {
    return <span className="commented">{props.author} {bubble} </span>;
  } else if (props.state === 'ISSUECOMMENTED') {
    return <span className="issue-commented">{props.author} {bubble} </span>;
  } else if (props.state === 'DISMISSED') {
    return <span className="dismissed">{props.author} - </span>;
  }
  return null;
}

export const PR = (props: any) => {
  console.log(props.pr)
  const { createdAt, reviews, comments, baseRefName, author, headRefOid, timeline, url, repository, title } = props.pr;
  const createdAtDate = new Date(createdAt);
  const events = combineReviewsAndComments(reviews, comments);
  const timeDistance = <span title={formatRFC3339(createdAtDate)}>{formatDistanceToNowStrict(createdAtDate)} ago</span>;
  const commitState = getCommitState(headRefOid, timeline);

  return (
    <div className={getAgeString(createdAtDate)}>
      {timeDistance} {baseRefName} {author.login} {commitState}&nbsp;
      <a href={url} target="_blank" rel="noopener noreferrer">{`${repository.name}/pull/${props.pr.number}`}</a>&nbsp;
      {title}
      <br />
      {events.map((event) => <TimelineEvent key={event.createdAt} {...event} />)}
    </div>
  );
}
const combineReviewsAndCommentsGitHubStats = (data: any[]) => {
  console.log(data)
  const events: Event[] = [];
  for (let x in data) {
    console.log(data[x]);
    data[x].forEach((y: any) => {
      y.reviews.nodes?.forEach((review: any) => {
        const event: Event = {
          createdAt: review.createdAt,
          author: review.author.login,
          state: review.state,
        }
        events.push(event);
      })

      y.comments.nodes.forEach((comment: any) => {
        const event: Event = {
          createdAt: comment.createdAt,
          author: comment.author.login,
          state: "ISSUECOMMENTED",
        }
        events.push(event);
      })

    })
  }
  return events.sort(sortByCreatedAt);
}
export const GitHubStats = (props: any) => {

  // let m: any[] = [];

  // for (const t in props.namr) {
  console.log(props)
  console.log(props.propItem)

  // const perMonth = props.propItem.repoData?.forEach((w: any) => {
  //   console.log(w)
  const grp = props.propItem.repoData?.reduce((w: any[], r: any) => {
    const month = r.mergedAt.split('T')[0].split('-')[1];
    console.log(month);
    if (!w[month]) {
      w[month] = [];
    }
    w[month].push(r);
    return w;
  }, {})

  let arr: any[] = [];
  if (!(grp == null || grp == undefined))
    Object.keys(grp).map(function (key) {
      arr?.push({ "month": key, "prs": grp[key] })
      return arr;
    });

  console.log(arr)
  console.log(arr.filter((y: any) => y.month == '08').map((r:any) => r.prs.length)[0])
  // return grp;

  // });

  //   m.push({ key: t, grp })
  // console.log(grp)

  // console.log(m)

  //const { reviews, comments, baseRefName, author, headRefOid, timeline, url, repository, title, mergedAt } = props.pr;
  // const mergedAtDate = new Date(mergedAt);
  // const events = combineReviewsAndCommentsGitHubStats(props.pr);
  // console.log(events);

  // const commitState = getCommitState(headRefOid, timeline);

  return (
    <tr>
      <td>{props.propItem.repoName}</td>
      <td>
        {arr.filter((y: any) => y.month == '08').map((r:any) => r.prs.length)[0]}
      </td>
      <td>{arr.filter((y: any) => y.month == '09').map((r:any) => r.prs.length)[0]}</td>
      <td>{arr.filter((y: any) => y.month == '10').map((r:any) => r.prs.length)[0]}</td>
      <td>{arr.filter((y: any) => y.month == '11').map((r:any) => r.prs.length)[0]}</td>
      <td>{arr.filter((y: any) => y.month == '12').map((r:any) => r.prs.length)[0]}</td>
    </tr>
    //   {baseRefName} {author.login} {commitState}&nbsp;
    // <a href={url} target="_blank" rel="noopener noreferrer">{`${repository.name}/pull/${props.pr.number}`}</a>&nbsp;
    // {events.map((event) => <TimelineEvent key={mergedAt} {...event} />)}
  );
}
