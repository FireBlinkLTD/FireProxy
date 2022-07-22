import {suite, test} from 'mocha-typescript';
import { TestServer, TestProxy } from './helpers';
import axios from 'axios';
import {deepEqual} from 'assert';

@suite()
export class HttpProxySuccessSuite {
    private server: TestServer = null;
    private proxy: TestProxy = null;

    private get proxyUrl() {
      return `http://localhost:${TestProxy.PORT}`;
    }

    /**
     * Before hook
     */
    async before(): Promise<void> {
      this.server = new TestServer();
      this.proxy = null;

      await this.server.start();
    }

    /**
     * After hook
     */
    async after(): Promise<void> {
      await this.proxy?.stop();
      await this.server.stop();
    }

    /**
     * Init proxy server
     */
    private async initProxy(): Promise<void> {
      this.proxy = new TestProxy();
      await this.proxy.start();
    }

    @test()
    async echoRequest(): Promise<void> {
      await this.initProxy();

      const testData = [];
      for (let i = 0; i < 1000 * 1000; i++) {
        testData.push('Iteration - ' + i);
      }

      const result = await axios.post(`${this.proxyUrl}/echo`, testData, {
        maxBodyLength: 50 * 1024 * 1024, // 50 mb
      });
      deepEqual(result.data, testData);
    }

    @test()
    async queryRequest(): Promise<void> {
      await this.initProxy();

      const result = await axios.get(`${this.proxyUrl}/query?test=1`);
      deepEqual(result.data, {
        query: {
          test: '1',
        }
      });
    }

    @test()
    async headersRequest(): Promise<void> {
      await this.initProxy();

      const result = await axios.get(`${this.proxyUrl}/headers`, {
        headers: {
          ReqConfigLevelCLEAR: 'empty',
          REQConfigLevelOverwrite: 'overwrite',
          Test: 'true',
        }
      });

      const responseHeaders = {
        reqconfigleveloverwrite: result.data.headers['reqconfigleveloverwrite'],
        reqproxylevel: result.data.headers['reqproxylevel'],
        reqproxylevelclear: result.data.headers['reqproxylevelclear'],
        test: result.data.headers['test'],
      }

      deepEqual(responseHeaders, {
        reqconfigleveloverwrite: 'PROXY-REQUEST-OVERWRITE',
        reqproxylevel: 'PROXY-REQUEST',
        reqproxylevelclear: undefined,
        test: 'true',
      });
    }
}
