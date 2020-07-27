import React from 'react';
import { addWeeks, addDays, addHours, isAfter, formatRFC3339 } from 'date-fns';
import sortByCreatedAt from './utils';

type Event = {
	createdAt: string;
	author: string;
	state: string;
}

const combineReviewsAndComments = (reviews: any, comments: any) => {
	const events: Event[] = [];

  reviews.nodes.forEach((review: any) => {
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
  } else if (isAfter(createdAt, addHours(current, -2))){
    return 'last-two-hours';
  } else if (isAfter(createdAt, addDays(current, -1))){
    return 'last-day';
  } else if (isAfter(createdAt, addWeeks(current, -1))){
    return 'last-week';
  }
  return 'over-week-old';
}

const getCommitState = (headRefOid: string, timeline: any) => {
  const commit = timeline.nodes.find((commit: any) => commit.oid === headRefOid);
  const [checkmark, circle, cross] = ['\u2714', '\u25cf', '\u2613'];

  if (!commit.status) {
    return null;
  } else if (commit.status.state === 'SUCCESS') {
    return <span className="success">{checkmark}</span>;
  } else if (commit.status.state === 'PENDING') {
    return <span className="pending">{circle}</span>;
  }

  return <span className="failed">{cross}</span>;
}

const Event = (props: Event) => {
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

const PR = (props: any) => {
  const createdAt = new Date(props.pr.createdAt);
  const events = combineReviewsAndComments(props.pr.reviews, props.pr.comments);

  return (
    <div className={getAgeString(createdAt)}>
      {formatRFC3339(createdAt)} {props.pr.baseRefName} {props.pr.author.login} {getCommitState(props.pr.headRefOid, props.pr.timeline)}&nbsp;
      <a href={props.pr.url}>{props.pr.url}</a>&nbsp;
      {props.pr.title}
      <br />
      {events.map((event) => <Event key={event.createdAt} {...event} />)}
    </div>
  );
}

export default PR;
