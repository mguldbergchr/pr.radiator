import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { PR, GitHubStats } from './PR';
import { queryPRs, queryTeamRepos, queryGitHubForPRStats } from './github';
import { group } from 'console';
import { getNameOfDeclaration } from 'typescript';

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
    if (delay) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}


function App() {
  const [PRs, setPRs] = useState<any[]>([]);
  const [GitHubPRs, setGitHubPRs] = useState<any[]>([]);
  const [intervalInput, setIntervalInput] = useState(60);
  const [showCodeOwnerPRs, setShowCodeOwnerPRs] = useState(false);
  const [showDependabotPRs, toggleDependabotPRs] = useState(true);

  const [config, setConfig] = useState(() => ({
    token: localStorage.getItem('PR_RADIATOR_TOKEN') ?? '',
    owner: localStorage.getItem('PR_RADIATOR_OWNER') ?? '',
    team: localStorage.getItem('PR_RADIATOR_TEAM') ?? '',
    repos: JSON.parse(localStorage.getItem('PR_RADIATOR_REPOS') ?? '[]'),
    pollingInterval: parseInt(localStorage.getItem('PR_RADIATOR_POLLING_INTERVAL') ?? '0'),
    ignoreRepos: JSON.parse(localStorage.getItem('PR_RADIATOR_IGNORE_REPOS') ?? '[]')
  }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const owner = (document.getElementById('owner') as HTMLInputElement).value;
    const token = (document.getElementById('token') as HTMLInputElement).value;
    const team = (document.getElementById('team') as HTMLInputElement).value;
    const pollingIntervalInput: HTMLInputElement = document.getElementById('polling-interval') as HTMLInputElement;
    const pollingInterval = pollingIntervalInput?.value ? parseInt(pollingIntervalInput.value) * 1000 : 0;

    localStorage.setItem('PR_RADIATOR_OWNER', owner);
    localStorage.setItem('PR_RADIATOR_TOKEN', token);
    localStorage.setItem('PR_RADIATOR_TEAM', team);
    localStorage.setItem('PR_RADIATOR_POLLING_INTERVAL', pollingInterval.toString());

    setConfig({ ...config, team, token, owner, pollingInterval })
  }

  useEffect(() => {
    function onKeydown(event: any) {
      // 'c' toggles code owned or participated in PR visibility
      if (event.keyCode === 67) {
        setShowCodeOwnerPRs(!showCodeOwnerPRs);
      }
      // 'd' toggles dependabot PR visibility
      if (event.keyCode === 68) {
        toggleDependabotPRs(!showDependabotPRs);
      }
      // '\' backslash clears repo names to trigger refetching
      if (event.keyCode === 220) {
        localStorage.removeItem('PR_RADIATOR_REPOS');
        setConfig({ ...config, repos: [] });
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [showCodeOwnerPRs, showDependabotPRs, config]);

  useEffect(() => {
    async function getTeamRepos(token: string, owner: string, team: string) {
      try {
        const repos = await queryTeamRepos(config.token, config.owner, config.team);
        localStorage.setItem('PR_RADIATOR_REPOS', JSON.stringify(repos));
        setConfig({ ...config, repos });
      } catch {
        console.log('Failed to fetch team repos');
      }
    }
    if (config.token && config.owner && config.team && config.repos.length === 0) {
      getTeamRepos(config.token, config.owner, config.team);
    }
  }, [config]);

  useEffect(() => {
    async function getPRsFromGithub(token: string, owner: string, repos: string[]) {
      try {
        const PRs = await queryPRs(token, owner, repos);
        setPRs([]);
      } catch {
        console.log('Failed to fetch PRs');
      }
    }
    if (config.token && config.owner && config.repos.length > 0) {
      const filteredRepos = config.repos.filter((repo: string) => !config.ignoreRepos.includes(repo));
      getPRsFromGithub(config.token, config.owner, filteredRepos);
    }
  }, [config]);

  useInterval(() => {
    async function getPRsFromGithub(token: string, owner: string, repos: string[]) {
      try {
        const PRs = await queryPRs(token, owner, repos);
        setPRs([]);
      } catch {
        console.log('Failed to fetch PRs');
      }
    }
    if (config.token && config.owner && config.repos.length > 0) {
      const filteredRepos = config.repos.filter((repo: string) => !config.ignoreRepos.includes(repo));
      getPRsFromGithub(config.token, config.owner, filteredRepos);
    }
  }, config.pollingInterval);

  useEffect(() => {
    async function getPRsStatsFromGithub(token: string, owner: string, repos: string[]) {
      try {
        const GitHubPRs = await queryGitHubForPRStats(token, owner, repos);
        setGitHubPRs(GitHubPRs);
      } catch {
        console.log('Failed to fetch PRs');
      }
    }
    if (config.token && config.owner && config.repos.length > 0) {
      const filteredRepos = config.repos.filter((repo: string) => !config.ignoreRepos.includes(repo));
      console.log(filteredRepos)
      getPRsStatsFromGithub(config.token, config.owner, filteredRepos);
    }
  }, [config]);

  const reduceGitHubPRStats = (x: any[] | null) => {
    console.log(x)
    // const groups = x?.reduce((y, repo) => {

    //   if (!y[repo.repository.name]) {
    //     y[repo.repository.name] = [];
    //   }
    //   y[repo.repository.name].push(repo);
    //   return y;
    // }, {})
    const groups = x?.reduce((y, repo) => {

      if (!y[repo.repository.name]) {
        y[repo.repository.name] = [];
      }
      y[repo.repository.name].push(repo);
      return y;
    }, {})
    console.log(groups)
    let arr: any[] = [];
    if (!(groups == null || groups == undefined))
      Object.keys(groups).map(function (key) {
        arr?.push({ "repoName": key, "repoData": groups[key] })
        return arr;
      });
    console.log(arr);

    return arr
  }

  const isViewerCodeOwner = (reviewRequests: any) => reviewRequests.nodes.some((req: any) => req.requestedReviewer.isViewer);
  const isViewerParticipant = (participants: any) => participants.nodes.some((participant: any) => participant.isViewer)
  const filterCombined = (pr: any) => !showCodeOwnerPRs || (isViewerCodeOwner(pr.reviewRequests) || isViewerParticipant(pr.participants));
  const filterDependabot = (pr: any) => !showDependabotPRs || pr.author.login !== 'dependabot';
  const combinedPRs = PRs.length > 0 ? PRs.filter(filterCombined) : null;
  const displayPRs = combinedPRs && combinedPRs.length > 0 ? combinedPRs.filter(filterDependabot).map(pr => <PR key={pr.url} pr={pr} />) : null;
  const combinedGitHubPRs = GitHubPRs.length > 0 ? GitHubPRs.filter(filterCombined).filter(filterDependabot) : null;
  const combinedGitHubPRStats = reduceGitHubPRStats(combinedGitHubPRs);
  // const displayGitHubPRs = combinedGitHubPRs && combinedGitHubPRs.length > 0 ? combinedGitHubPRs.filter(filterDependabot).map(pr => <PR key={pr.url} pr={pr} />) : null;
  const displayGitHubPRs = combinedGitHubPRStats && combinedGitHubPRStats.length > 0 ? combinedGitHubPRStats.map((item, idx) => <GitHubStats key={idx} propItem={item} />) : null;
  
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => setIntervalInput(parseInt(e.target.value));

  if (!config.token || !config.owner || !config.team) {
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

  if (config.repos.length === 0) {
    return <div>{`Fetching ${config.team} team repositories.. This may take up to five minutes`}</div>;
  }

  document.title = `(${displayPRs?.length}) PR Radiator`;

  return <div>
    <div className="App">{displayPRs}</div>
    <div>------{displayGitHubPRs?.length}-------</div>

    <div>
      <table>
        <tr>
          <th>Repo Name</th>
          <th>Aug</th>
          <th>Sept</th>
          <th>Oct</th>
          <th>Nov</th>
          <th>Dec</th>
        </tr>
        {displayGitHubPRs}

      </table>
    </div>
  </div>
}

export default App;
