import { Grid, GridItem, useColorModeValue, Table, Thead, Tbody, Td, Th, Tr } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { Card } from "../atoms/Card";
import { FilterGroup, Filtering } from "../organisms/Filtering";
import { Loader } from "../organisms/Loader";

interface Distribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface NamedCount {
  name: string;
  count: number;
  total: number;
  readyPercentage: number;
  notReadyPercentage: number;
}

interface ClientData {
  clients: NamedCount[];
  operatingSystems: NamedCount[];
  languages: NamedCount[];
  distribution: Distribution[]
}

const london: FilterGroup[] = [
  [{ name: 'name', value: 'geth' }, { name: 'major', value: '1', operator: 'gte' }, { name: 'minor', value: '10', operator: 'gte' }, { name: 'patch', value: '4', operator: 'gte' }],
  [{ name: 'name', value: 'nethermind' }, { name: 'major', value: '1', operator: 'gte' }, { name: 'minor', value: '10', operator: 'gte' }, { name: 'patch', value: '73', operator: 'gte' }],
  [{ name: 'name', value: 'turbogeth' }, { name: 'major', value: '2021', operator: 'gte' }, { name: 'minor', value: '6', operator: 'gte' }, { name: 'patch', value: '4', operator: 'gte' }],
  [{ name: 'name', value: 'turbo-geth' }, { name: 'major', value: '2021', operator: 'gte' }, { name: 'minor', value: '6', operator: 'gte' }, { name: 'patch', value: '4', operator: 'gte' }],
  [{ name: 'name', value: 'erigon' }, { name: 'major', value: '2021', operator: 'gte' }, { name: 'minor', value: '6', operator: 'gte' }, { name: 'patch', value: '4', operator: 'gte' }],
  [{ name: 'name', value: 'besu' }, { name: 'major', value: '21', operator: 'gte' }, { name: 'minor', value: '7', operator: 'gte' }, { name: 'patch', value: '0', operator: 'gte' }],
  [{ name: 'name', value: 'openethereum' }, { name: 'major', value: '3', operator: 'gte' }, { name: 'minor', value: '3', operator: 'gte' }, { name: 'patch', value: '0', operator: 'gte' }],
  [{ name: 'name', value: 'ethereum-js' }, { name: 'major', value: '5', operator: 'gte' }, { name: 'minor', value: '4', operator: 'gte' }, { name: 'patch', value: '1', operator: 'gte' }],
]

const normalizeNames: { [key: string]: string } = {
  'turbogeth': 'erigon',
  'turbo-geth': 'erigon',
}

const londonFilter = JSON.stringify(london.map(l => (l.map(f => {
  const tokens = [f?.name, f?.value]
  if (f?.operator) tokens.push(f?.operator)
  return tokens.join(':')
}))))

const londonAllFilter = JSON.stringify(london.map(l => ([`name:${l[0]?.value}`])))

type NamedCountMap = { [name: string]: NamedCount }

function convertListToMap(list: NamedCount[]): NamedCountMap {
  return list.reduce((map: NamedCountMap, item) => {
    map[normalizeNames[item.name] || item.name] = item;
    return map;
  }, {});
}

function processItem(readyMap: NamedCountMap, item: NamedCount) {
  item.total = item.count
  item.count = item.name in readyMap ? readyMap[item.name].count : 0
  item.readyPercentage = Math.ceil(item.count / item.total * 100)
  item.notReadyPercentage = Math.ceil((item.total - item.count) / item.total * 100)
  return item
}

export function London() {
  const color = useColorModeValue("gray.800", "gray")
  const [data, setData] = useState<ClientData>()

  useEffect(() => {
    const run = async () => {
      const responseAll = await fetch(`/v1/dashboard?filter=${londonAllFilter}`)
      const responseReady = await fetch(`/v1/dashboard?filter=${londonFilter}`)
      const allJson: ClientData = await responseAll.json()
      const readyJson: ClientData = await responseReady.json()

      const readyClientsMap = convertListToMap(readyJson.clients)
      const readyOperatingSystemsMap = convertListToMap(readyJson.operatingSystems)
      const readyLanguagesMap = convertListToMap(readyJson.languages)

      allJson.languages = allJson.languages.map((item) => processItem(readyLanguagesMap, item))
      allJson.operatingSystems = allJson.operatingSystems.map((item) => processItem(readyOperatingSystemsMap, item))
      allJson.clients = allJson.clients.map((item) => processItem(readyClientsMap, item))

      let readyCount = 0
      let notReadyCount = 0
      allJson.clients.forEach(c => {
        readyCount += c.count
        notReadyCount += c.total - c.count
      })

      let totalCount = readyCount + notReadyCount

      allJson.distribution = [
        { name: 'Ready', count: readyCount, percentage: Math.ceil(readyCount / totalCount * 100), color: 'green' },
        { name: 'Not ready', count: notReadyCount, percentage: Math.ceil(notReadyCount / totalCount * 100), color: 'red' }
      ]

      setData(allJson)
    }

    run()
  }, [])

  if (!data) {
    return <Loader>Processing data</Loader>
  }

  const renderLabelContent = (props: any): any => {
    const { name, value, percent, x, y, midAngle } = props;
    return (
      <g transform={`translate(${x}, ${y})`} textAnchor={(midAngle < -90 || midAngle >= 90) ? 'end' : 'start'} fill={color}>
        <text x={0} y={0}>{`${name || "unknown"}`}</text>
        <text x={0} y={20}>{`${value} (${(percent * 100).toFixed(2)}%)`}</text>
      </g>
    );
  };

  return (
    <Grid gridGap="8" templateColumns="repeat(2, 1fr)" w="100%">
      <GridItem colSpan={2}>
        <Filtering filters={london} />
      </GridItem>
      <GridItem colSpan={1}>
        <Card title="London clients" w="99%" contentHeight={data.clients.length * 40}>
          <Table>
            <Thead>
              <Tr>
                <Th>Client</Th>
                <Th>Ready</Th>
                <Th>Not-Ready</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.clients.map((item, index) => (
                <Tr key={index}>
                  <Td>{item.name}</Td>
                  <Td>{item.count} ({item.readyPercentage}%)</Td>
                  <Td>{item.total - item.count} ({item.notReadyPercentage}%)</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </GridItem>
      <GridItem colSpan={1}>
        <Card title="Client distribution" w="99%" contentHeight={300}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data.distribution}
                stroke="none"
                dataKey="count"
                startAngle={180}
                endAngle={-180}
                innerRadius={30}
                minAngle={20}
                outerRadius={100}
                paddingAngle={2}
                label={renderLabelContent}
                isAnimationActive={false}
              >
                {
                  data.distribution.map((entry, index) => (
                    <Cell
                      key={`slice-${index}`}
                      fill={entry.color}
                    />
                  ))
                }
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </GridItem>
    </Grid>
  )
}
