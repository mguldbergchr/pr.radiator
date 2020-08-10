import React, { useEffect, useState, FormEvent, useRef } from 'react';
import PR from './PR';
import { queryPRs, queryTeamRepos } from './github';

function useInterval(callback: any, delay: any) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      // @ts-ignore
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

function App() {
  const [PRs, setPRs] = useState<any[]>([]);
  const [intervalInput, setIntervalInput] = useState(60);

  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('PR_RADIATOR_TOKEN') ?? '');
  const [owner, setOwner] = useState(() => localStorage.getItem('PR_RADIATOR_OWNER') ?? '');
  const [team, setTeam] = useState(() => localStorage.getItem('PR_RADIATOR_TEAM') ?? '');
  const [repos, setRepos] = useState(() => JSON.parse(localStorage.getItem('PR_RADIATOR_REPOS') ?? '[]'));
  const [ignoreRepos] = useState(() => JSON.parse(localStorage.getItem('PR_RADIATOR_IGNORE_REPOS') ?? '[]'));
  const [pollingInterval, setPollingInterval] = useState(() => parseInt(localStorage.getItem('PR_RADIATOR_POLLING_INTERVAL') ?? '0'));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const ownerInput: HTMLInputElement = document.getElementById('owner') as HTMLInputElement;
    const tokenInput: HTMLInputElement = document.getElementById('token') as HTMLInputElement;
    const teamInput: HTMLInputElement = document.getElementById('team') as HTMLInputElement;
    const pollingIntervalInput: HTMLInputElement = document.getElementById('polling-interval') as HTMLInputElement;

    localStorage.setItem('PR_RADIATOR_OWNER', ownerInput.value);
    localStorage.setItem('PR_RADIATOR_TOKEN', tokenInput.value);
    localStorage.setItem('PR_RADIATOR_TEAM', teamInput.value);
    if (pollingIntervalInput?.value) {
      const interval = parseInt(pollingIntervalInput.value) * 1000;
      localStorage.setItem('PR_RADIATOR_POLLING_INTERVAL', interval.toString());
      setPollingInterval(interval);
    }

    setTeam(teamInput.value);
    setGithubToken(tokenInput.value);
    setOwner(ownerInput.value);
  }

  useEffect(() => {
    async function getTeamRepos(token: string, owner: string, team: string) {
      try {
        const repoNames = await queryTeamRepos(token, owner, team);
        localStorage.setItem('PR_RADIATOR_REPOS', JSON.stringify(repoNames));
        setRepos(repoNames);
      } catch {
        console.log('Failed to fetch team repos');
      }
    }
    if (githubToken && owner && team && repos.length === 0) {
      getTeamRepos(githubToken, owner, team);
    }
  }, [githubToken, owner, team, repos, setRepos]);

  useEffect(() => {
    async function getPRsFromGithub(token: string, owner: string, repos: string[]) {
      try {
        const PRs = await queryPRs(token, owner, repos);
        setPRs(PRs);

        document.title = `(${PRs.length}) PR Radiator`;
      } catch {
        console.log('Failed to fetch PRs');
      }
    }
    if (githubToken && owner && repos.length > 0) {
      const filteredRepos = repos.filter((repo: string) => !ignoreRepos.includes(repo));
      getPRsFromGithub(githubToken, owner, filteredRepos);
    }
  }, [ignoreRepos, githubToken, owner, repos]);

  useInterval(() => {
    async function getPRsFromGithub(token: string, owner: string, repos: string[]) {
      try {
        const PRs = await queryPRs(token, owner, repos);
        setPRs(PRs);

        document.title = `(${PRs.length}) PR Radiator`;
      } catch {
        console.log('Failed to fetch PRs');
      }
    }
    if (githubToken && owner && repos.length > 0) {
      const filteredRepos = repos.filter((repo: string) => !ignoreRepos.includes(repo));
      getPRsFromGithub(githubToken, owner, filteredRepos);
    }
  }, pollingInterval ?? null);

  const displayPRs = PRs.length > 0 ? PRs.map((pr: any) => <PR key={pr.url} pr={pr} />) : null;
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => setIntervalInput(parseInt(e.target.value));

  if (githubToken.length === 0 || owner.length === 0 || !team) {
    return (
      <div className="settings-form">
        <h1>Configure PR Radiator</h1>
        <form autoComplete="off" onSubmit={onSubmit}>
          <input type="text" id="owner" placeholder="Github Organization" autoFocus={true} autoComplete="off" />
          <input type="text" id="team" placeholder="Github Team" autoComplete="off" />
          <input type="password" id="token" placeholder="Github Personal Access Token" autoComplete="new-password" />
          <div>
        Github Polling Interval <input type="number" id="polling-interval" onChange={handleOnChange} value={intervalInput} min="5" /> (seconds)</div>
          <input type="submit" value="Begin" id="submit" />
        </form>
      </div>
    );
  }

  if (repos.length === 0) {
    return <div>{`Fetching ${team} team repositories.. This may take up to five minutes`}</div>;
  }

  return <div className="App">{displayPRs}</div>;
}

export default App;
